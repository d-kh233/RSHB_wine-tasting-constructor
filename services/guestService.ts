// Гость: вход по коду, анкета (blind-safe), оценка с защитой от дублей, итоги (PLAN.md U6–U9, U13).
// Гость идентифицируется cookie-токеном; в БД хранится только sha256 от него.

import type { Guest, Tasting } from "@prisma/client";
import { generateGuestToken, normalizeInviteCode, sha256 } from "@/lib/auth";
import { blindWineLabel, TASTING_STATUS, WINE_STATUS, type TastingMode } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  isWineVisibleToGuest,
  toGuestRatingDTO,
  toGuestTastingDTO,
  toGuestTastingWineDTO,
  type GuestRatingDTO,
  type GuestTastingDTO,
  type GuestTastingWineSource,
  type PublicResultsDTO,
} from "@/lib/dto";
import { conflict, isUniqueViolation, notFound, unauthorized, unprocessable } from "@/lib/http";
import { formatScaleValue, getScale, isValidValue, type ScaleId } from "@/lib/scales";
import { groupBy, rankByScore, wineStats } from "@/lib/stats";
import type { RateInput } from "@/lib/validation";

async function findTasting(inviteCode: string): Promise<Tasting | null> {
  return db.tasting.findUnique({ where: { inviteCode: normalizeInviteCode(inviteCode) } });
}

async function requireTasting(inviteCode: string): Promise<Tasting> {
  const tasting = await findTasting(inviteCode);
  if (!tasting) throw notFound("Дегустация с таким кодом не найдена");
  return tasting;
}

/** Гость по токену из cookie — только если он из этой же дегустации. */
async function findGuest(tasting: Tasting, token: string | null): Promise<Guest | null> {
  if (!token) return null;
  const guest = await db.guest.findUnique({ where: { tokenHash: sha256(token) } });
  return guest && guest.tastingId === tasting.id ? guest : null;
}

/**
 * Программа для гостя. Слепой режим: программу читаем БЕЗ include wine. Данные вин подгружаем
 * отдельным запросом и только для видимых гостю (открытый режим или бутылка раскрыта) —
 * остальные не покидают БД.
 */
async function loadGuestProgram(tasting: Tasting): Promise<GuestTastingWineSource[]> {
  const program = await db.tastingWine.findMany({ where: { tastingId: tasting.id }, orderBy: { position: "asc" } });
  const visibleWineIds = program
    .filter((tw) => isWineVisibleToGuest(tasting.mode, tw.revealedAt))
    .map((tw) => tw.wineId);
  const visibleWines = visibleWineIds.length ? await db.wine.findMany({ where: { id: { in: visibleWineIds } } }) : [];
  const wineById = new Map(visibleWines.map((w) => [w.id, w]));
  return program.map((tw) => ({ ...tw, wine: wineById.get(tw.wineId) ?? null }));
}

/* ---------- Вход ---------- */

export interface JoinResult {
  guestId: string;
  /** Новый токен для cookie; null — гость уже был, cookie не меняется. */
  newToken: string | null;
}

export async function join(inviteCode: string, displayName: string | null, token: string | null): Promise<JoinResult> {
  const tasting = await requireTasting(inviteCode);
  if (tasting.status === TASTING_STATUS.PUBLISHED) {
    throw conflict("JOIN_CLOSED", "Дегустация завершена, вход закрыт");
  }

  // Повторный заход с тем же cookie не создаёт нового гостя.
  const existing = await findGuest(tasting, token);
  if (existing) {
    if (displayName && displayName !== existing.displayName) {
      await db.guest.update({ where: { id: existing.id }, data: { displayName } });
    }
    return { guestId: existing.id, newToken: null };
  }

  const newToken = generateGuestToken();
  const guest = await db.guest.create({ data: { tastingId: tasting.id, displayName, tokenHash: sha256(newToken) } });
  return { guestId: guest.id, newToken };
}

/* ---------- Анкета (blind-safe) ---------- */

export async function exists(inviteCode: string): Promise<boolean> {
  return (await findTasting(inviteCode)) !== null;
}

export async function findGuestView(inviteCode: string, token: string | null): Promise<GuestTastingDTO | null> {
  const tasting = await findTasting(inviteCode);
  if (!tasting) return null;

  const program = await loadGuestProgram(tasting);
  const guest = await findGuest(tasting, token);
  const ratings = guest ? await db.rating.findMany({ where: { guestId: guest.id } }) : [];
  return toGuestTastingDTO(tasting, program, guest, ratings);
}

export async function getGuestView(inviteCode: string, token: string | null): Promise<GuestTastingDTO> {
  const view = await findGuestView(inviteCode, token);
  if (!view) throw notFound("Дегустация с таким кодом не найдена");
  return view;
}

/* ---------- Оценка ---------- */

export async function rate(inviteCode: string, token: string | null, input: RateInput): Promise<GuestRatingDTO> {
  const tasting = await requireTasting(inviteCode);
  const guest = await findGuest(tasting, token);
  if (!guest) throw unauthorized();

  if (tasting.status !== TASTING_STATUS.RUNNING) {
    throw conflict(
      "TASTING_NOT_RUNNING",
      tasting.status === TASTING_STATUS.DRAFT ? "Дегустация ещё не началась" : "Приём оценок завершён",
    );
  }

  const tw = await db.tastingWine.findFirst({ where: { id: input.tastingWineId, tastingId: tasting.id } });
  if (!tw) throw notFound("Вино не найдено в программе");

  const duplicate = () => conflict("DUPLICATE_RATING", "Вы уже оценили это вино");
  const existing = await db.rating.findUnique({
    where: { guestId_tastingWineId: { guestId: guest.id, tastingWineId: tw.id } },
  });
  if (existing) throw duplicate();

  if (tw.status !== WINE_STATUS.OPEN) {
    throw conflict(
      "WINE_NOT_OPEN",
      tw.status === WINE_STATUS.PENDING ? "Это вино ещё не открыто организатором" : "Вино уже закрыто организатором",
    );
  }

  if (!isValidValue(tasting.scale, input.value)) {
    const { min, max, step } = getScale(tasting.scale);
    throw unprocessable(
      "VALUE_OUT_OF_SCALE",
      `Оценка должна быть от ${formatScaleValue(tasting.scale, min)} до ${formatScaleValue(tasting.scale, max)} с шагом ${String(step).replace(".", ",")}`,
    );
  }

  try {
    const rating = await db.rating.create({
      data: {
        tastingId: tasting.id,
        tastingWineId: tw.id,
        guestId: guest.id,
        value: input.value,
        scale: tasting.scale,
        note: tasting.notesEnabled ? input.note : null,
      },
    });
    return toGuestRatingDTO(rating);
  } catch (err) {
    // Параллельный второй запрос (двойной клик) прошёл проверку выше — его останавливает UNIQUE в БД.
    if (isUniqueViolation(err)) throw duplicate();
    throw err;
  }
}

/* ---------- Итоги (после публикации) ---------- */

/** Публичные итоги: места, средние и — если гость вошёл — его оценки. Только в `published`. */
export async function getResults(inviteCode: string, token: string | null): Promise<PublicResultsDTO> {
  const tasting = await requireTasting(inviteCode);
  if (tasting.status !== TASTING_STATUS.PUBLISHED) {
    throw conflict("NOT_PUBLISHED", "Итоги ещё не опубликованы");
  }

  const [program, ratings, guestsCount, guest] = await Promise.all([
    loadGuestProgram(tasting),
    db.rating.findMany({ where: { tastingId: tasting.id }, select: { tastingWineId: true, guestId: true, value: true } }),
    db.guest.count({ where: { tastingId: tasting.id } }),
    findGuest(tasting, token),
  ]);

  const byWine = groupBy(ratings, (r) => r.tastingWineId);
  const rows = program.map((tw) => {
    const own = byWine.get(tw.id) ?? [];
    const stats = wineStats(tasting.scale, own.map((r) => r.value));
    return {
      tastingWineId: tw.id,
      position: tw.position,
      label: blindWineLabel(tw.position),
      wine: toGuestTastingWineDTO(tasting.mode, tw).wine,
      count: stats.count,
      avg: stats.avg,
      avg100: stats.avg100,
      myValue: (guest && own.find((r) => r.guestId === guest.id)?.value) ?? null,
    };
  });

  return {
    title: tasting.title,
    mode: tasting.mode as TastingMode,
    scale: tasting.scale as ScaleId,
    publishedAt: tasting.publishedAt?.toISOString() ?? null,
    guestsCount,
    rows: rankByScore(rows, (r) => r.avg100),
  };
}
