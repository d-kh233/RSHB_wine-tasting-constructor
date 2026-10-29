// Экспорт оценок дегустации в «Народный винный рейтинг» — формат RatingExportV1 (docs/rating-contract.md).
// Payload детерминирован: повторная выгрузка той же дегустации даёт тот же exportId и то же тело,
// поэтому повторная передача в рейтинг не создаёт дублей.

import { sha256 } from "@/lib/auth";
import {
  EXPORT_HASH_LENGTH,
  EXPORT_SCHEMA_VERSION,
  EXPORT_SOURCE_SYSTEM,
  REJECT_REASON,
  TASTING_STATUS,
  type RejectReason,
  type TastingMode,
  type WineColor,
} from "@/lib/constants";
import { db } from "@/lib/db";
import type { RatingExportV1 } from "@/lib/dto";
import { AppError, conflict, notFound } from "@/lib/http";
import { getScale, isValidValue, normalize100, normalize5 } from "@/lib/scales";
import { groupBy } from "@/lib/stats";

/**
 * exportId зависит от дегустации, момента её закрытия и версии формата. Версия — в ключе, потому что новая
 * версия меняет тело: под старым exportId импорт ответил бы 409. Повтор той же дегустации в новой версии
 * получает новый exportId, а дубли оценок отсекает UNIQUE(sourceTastingId, guestHash, wineId) в рейтинге.
 */
export const exportIdFor = (tastingId: string, closedAt: Date) =>
  `exp_${sha256(`${tastingId}|${closedAt.toISOString()}|${EXPORT_SCHEMA_VERSION}`).slice(0, EXPORT_HASH_LENGTH)}`;

/** Анонимный хэш гостя: без соли по guestId нельзя восстановить, кто это был. */
function guestHashFn(): (guestId: string) => string {
  const salt = process.env.EXPORT_SALT?.trim();
  if (!salt) {
    throw new AppError(500, "EXPORT_SALT_MISSING", "На сервере не задан EXPORT_SALT — экспорт невозможен");
  }
  return (guestId) => sha256(`${salt}${guestId}`).slice(0, EXPORT_HASH_LENGTH);
}

/** Причины отклонения в стабильном порядке (по коду) — для детерминированного payload. */
export function countReasons(reasons: RejectReason[]): { reason: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([reason, count]) => ({ reason, count }));
}

export async function build(adminKey: string): Promise<RatingExportV1> {
  const tasting = await db.tasting.findUnique({ where: { adminKey } });
  if (!tasting) throw notFound("Ссылка организатора недействительна");
  const finished = tasting.status === TASTING_STATUS.CLOSED || tasting.status === TASTING_STATUS.PUBLISHED;
  if (!finished || !tasting.closedAt) {
    throw conflict("NOT_CLOSED", "Передать оценки в рейтинг можно после завершения дегустации");
  }

  const [program, ratings] = await Promise.all([
    db.tastingWine.findMany({ where: { tastingId: tasting.id }, include: { wine: true }, orderBy: { position: "asc" } }),
    db.rating.findMany({
      where: { tastingId: tasting.id },
      select: { guestId: true, tastingWineId: true, value: true, scale: true },
    }),
  ]);

  const scale = getScale(tasting.scale);
  const guestHash = guestHashFn();
  const positionOf = new Map(program.map((tw) => [tw.id, tw.position]));
  const countByWine = groupBy(ratings, (r) => r.tastingWineId);
  const belowMinGuests = (twId: string) => (countByWine.get(twId)?.length ?? 0) < tasting.minGuests;

  // Валидность оценки для рейтинга (docs/rating-contract.md, «Правила валидности»).
  // Имена гостей и заметки в экспорт не попадают никогда.
  const rejected: RejectReason[] = [];
  const exported: RatingExportV1["ratings"] = [];
  for (const r of ratings) {
    if (r.scale !== tasting.scale) rejected.push(REJECT_REASON.SCALE_MISMATCH);
    else if (!isValidValue(scale.id, r.value)) rejected.push(REJECT_REASON.VALUE_OUT_OF_SCALE);
    else if (belowMinGuests(r.tastingWineId)) rejected.push(REJECT_REASON.BELOW_MIN_GUESTS);
    else {
      exported.push({
        guestHash: guestHash(r.guestId),
        tastingWineId: r.tastingWineId,
        value: r.value,
        scale: scale.id,
        normalized100: normalize100(scale.id, r.value),
        normalized5: normalize5(scale.id, r.value),
      });
    }
  }
  exported.sort(
    (a, b) =>
      positionOf.get(a.tastingWineId)! - positionOf.get(b.tastingWineId)! || a.guestHash.localeCompare(b.guestHash),
  );

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportId: exportIdFor(tasting.id, tasting.closedAt),
    source: {
      system: EXPORT_SOURCE_SYSTEM,
      tastingId: tasting.id,
      title: tasting.title,
      mode: tasting.mode as TastingMode,
      closedAt: tasting.closedAt.toISOString(),
      scale: { id: scale.id, min: scale.min, max: scale.max, step: scale.step },
    },
    wines: program.map((tw) => ({
      tastingWineId: tw.id,
      position: tw.position,
      wineId: tw.wine.id,
      name: tw.wine.name,
      producer: tw.wine.producer,
      vintage: tw.wine.vintage,
      region: tw.wine.region,
      country: tw.wine.country,
      grape: tw.wine.grape,
      color: tw.wine.color as WineColor | null,
    })),
    ratings: exported,
    stats: {
      totalRatings: ratings.length,
      exportedRatings: exported.length,
      rejected: countReasons(rejected),
    },
  };
}
