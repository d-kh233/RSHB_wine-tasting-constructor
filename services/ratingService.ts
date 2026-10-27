// «Народный винный рейтинг»: идемпотентный импорт экспорта RatingExportV1 и публичный рейтинг.
// Импорт не доверяет источнику: все правила валидности перепроверяются (docs/rating-contract.md).

import { sha256 } from "@/lib/auth";
import { NORMALIZED_TOLERANCE, REJECT_REASON, type RejectReason, type WineColor } from "@/lib/constants";
import { db } from "@/lib/db";
import type { ImportResultDTO, PublicRatingRowDTO } from "@/lib/dto";
import { badRequest, conflict, isUniqueViolation } from "@/lib/http";
import { isValidValue, normalize100, roundScore, SCALES } from "@/lib/scales";
import { rankByScore } from "@/lib/stats";
import { ratingExportSchema } from "@/lib/validation";
import { countReasons } from "./exportService";

/** JSON с отсортированными ключами: одинаковое по смыслу тело даёт одинаковый payloadHash. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Сохранённый результат прошлого импорта; тот же exportId с другим телом — конфликт. */
async function findPrevious(exportId: string, payloadHash: string): Promise<ImportResultDTO | null> {
  const prev = await db.ratingImport.findUnique({ where: { exportId } });
  if (!prev) return null;
  if (prev.payloadHash !== payloadHash) {
    throw conflict("EXPORT_ID_CONFLICT", "Этот exportId уже импортирован с другим содержимым");
  }
  return { ...(JSON.parse(prev.resultJson) as ImportResultDTO), repeated: true };
}

export interface ImportOutcome {
  result: ImportResultDTO;
  /** false — exportId уже импортировался, возвращён сохранённый результат. */
  created: boolean;
}

export async function importExport(body: unknown): Promise<ImportOutcome> {
  const payload = ratingExportSchema.parse(body);
  const payloadHash = sha256(canonicalJson(payload));

  const previous = await findPrevious(payload.exportId, payloadHash);
  if (previous) return { result: previous, created: false };

  // Ошибки структуры — весь экспорт отклоняется (400).
  const scale = SCALES[payload.source.scale.id];
  const { min, max, step } = payload.source.scale;
  if (min !== scale.min || max !== scale.max || step !== scale.step) {
    throw badRequest("SCALE_MISMATCH", `Параметры шкалы ${scale.id} не совпадают с эталонными`);
  }
  if (payload.stats.exportedRatings !== payload.ratings.length) {
    throw badRequest("STATS_MISMATCH", "stats.exportedRatings не совпадает с количеством оценок в ratings");
  }
  const wineByTw = new Map(payload.wines.map((w) => [w.tastingWineId, w]));
  if (wineByTw.size !== payload.wines.length) {
    throw badRequest("DUPLICATE_WINE", "В wines повторяется tastingWineId");
  }

  const sourceTastingId = payload.source.tastingId;
  const [catalog, existing] = await Promise.all([
    db.wine.findMany({ where: { id: { in: payload.wines.map((w) => w.wineId) } }, select: { id: true } }),
    db.publicRating.findMany({ where: { sourceTastingId }, select: { guestHash: true, wineId: true } }),
  ]);
  const inCatalog = new Set(catalog.map((w) => w.id));
  const key = (guestHash: string, wineId: string) => `${guestHash}|${wineId}`;
  const alreadyImported = new Set(existing.map((r) => key(r.guestHash, r.wineId)));

  // Ошибки отдельных оценок — оценка отклоняется, остальные принимаются.
  const seen = new Set<string>();
  const rejected: RejectReason[] = [];
  const accepted: { wineId: string; guestHash: string; normalized100: number }[] = [];
  for (const r of payload.ratings) {
    const wine = wineByTw.get(r.tastingWineId);
    const k = wine ? key(r.guestHash, wine.wineId) : "";
    const reason: RejectReason | null = !wine
      ? REJECT_REASON.UNKNOWN_TASTING_WINE
      : !inCatalog.has(wine.wineId)
        ? REJECT_REASON.UNKNOWN_WINE
        : !isValidValue(scale.id, r.value)
          ? REJECT_REASON.VALUE_OUT_OF_SCALE
          : Math.abs(normalize100(scale.id, r.value) - r.normalized100) > NORMALIZED_TOLERANCE
            ? REJECT_REASON.NORMALIZATION_MISMATCH
            : seen.has(k)
              ? REJECT_REASON.DUPLICATE_IN_EXPORT
              : alreadyImported.has(k)
                ? REJECT_REASON.ALREADY_IMPORTED
                : null;
    if (reason) {
      rejected.push(reason);
      continue;
    }
    seen.add(k);
    // Храним свой пересчёт, а не присланное число: одна функция normalize100 на всю систему.
    accepted.push({ wineId: wine!.wineId, guestHash: r.guestHash, normalized100: normalize100(scale.id, r.value) });
  }

  const result: ImportResultDTO = {
    exportId: payload.exportId,
    accepted: accepted.length,
    rejected: rejected.length,
    reasons: countReasons(rejected),
    repeated: false,
  };

  try {
    await db.$transaction(async (tx) => {
      const imp = await tx.ratingImport.create({
        data: {
          exportId: payload.exportId,
          sourceTastingId,
          payloadHash,
          acceptedCount: result.accepted,
          rejectedCount: result.rejected,
          resultJson: JSON.stringify(result),
        },
      });
      if (accepted.length) {
        await tx.publicRating.createMany({ data: accepted.map((a) => ({ ...a, importId: imp.id, sourceTastingId })) });
      }
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // Параллельный импорт того же exportId: отдаём результат того, кто успел первым.
    const raced = await findPrevious(payload.exportId, payloadHash);
    if (raced) return { result: raced, created: false };
    throw conflict("IMPORT_IN_PROGRESS", "Оценки этой дегустации сейчас импортируются, повторите запрос");
  }
  return { result, created: true };
}

/** Публичный рейтинг: среднее normalized100 по всем импортированным оценкам вина. */
export async function listPublic(): Promise<PublicRatingRowDTO[]> {
  const groups = await db.publicRating.groupBy({
    by: ["wineId", "sourceTastingId"],
    _sum: { normalized100: true },
    _count: { _all: true },
  });

  const byWine = new Map<string, { sum: number; count: number; tastings: number }>();
  for (const g of groups) {
    const acc = byWine.get(g.wineId) ?? { sum: 0, count: 0, tastings: 0 };
    acc.sum += g._sum.normalized100 ?? 0;
    acc.count += g._count._all;
    acc.tastings += 1;
    byWine.set(g.wineId, acc);
  }
  if (byWine.size === 0) return [];

  const wines = await db.wine.findMany({ where: { id: { in: [...byWine.keys()] } } });
  const rows = wines
    .map((w) => {
      const acc = byWine.get(w.id)!;
      return { wine: w, avg100: roundScore(acc.sum / acc.count), ratingsCount: acc.count, tastingsCount: acc.tastings };
    })
    // При равном среднем выше то вино, у которого больше оценок.
    .sort((a, b) => b.ratingsCount - a.ratingsCount || a.wine.name.localeCompare(b.wine.name, "ru"));

  return rankByScore(rows, (r) => r.avg100).map((r) => ({
    place: r.place!,
    wineId: r.wine.id,
    name: r.wine.name,
    producer: r.wine.producer,
    vintage: r.wine.vintage,
    region: r.wine.region,
    country: r.wine.country,
    color: r.wine.color as WineColor | null,
    isDemo: r.wine.isDemo,
    avg100: r.avg100,
    ratingsCount: r.ratingsCount,
    tastingsCount: r.tastingsCount,
  }));
}
