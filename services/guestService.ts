// Гость: вход по коду, анкета (blind-safe), оценка с защитой от дублей, итоги (PLAN.md U6–U9, U13).
// Гость идентифицируется cookie-токеном; в БД хранится только sha256 от него.

import type { Guest, Tasting } from "@prisma/client";
import { generateGuestToken, normalizeInviteCode, sha256 } from "@/lib/auth";
import {
  blindWineLabel,
  LIMITS,
  RATING_REJECT_REASON,
  TASTING_STATUS,
  WINE_STATUS,
  type RatingRejectReason,
  type TastingMode,
} from "@/lib/constants";
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
  type WineResultById,
} from "@/lib/dto";
import { AppError, conflict, isUniqueViolation, notFound, unauthorized, unprocessable } from "@/lib/http";
import type { ImageMime } from "@/lib/image";
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
  const [ratings, results] = await Promise.all([
    guest ? db.rating.findMany({ where: { guestId: guest.id } }) : [],
    loadRevealedResults(tasting, program),
  ]);
  return toGuestTastingDTO(tasting, program, guest, ratings, results);
}

/**
 * Среднее по раскрытым бутылкам — для экрана «Вы поставили X, среднее Y». Раскрыть можно только закрытое
 * вино, так что его среднее больше не меняется. Нераскрытые вина сюда не попадают.
 */
async function loadRevealedResults(tasting: Tasting, program: GuestTastingWineSource[]): Promise<WineResultById> {
  const revealedIds = program.filter((tw) => tw.revealedAt !== null).map((tw) => tw.id);
  if (revealedIds.length === 0) return new Map();
  const ratings = await db.rating.findMany({
    where: { tastingWineId: { in: revealedIds } },
    select: { tastingWineId: true, value: true },
  });
  const results: WineResultById = new Map();
  for (const [twId, own] of groupBy(ratings, (r) => r.tastingWineId)) {
    const { avg, count } = wineStats(tasting.scale, own.map((r) => r.value));
    if (avg !== null) results.set(twId, { avg, count });
  }
  return results;
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

  /** Отказ попадает в журнал (таблица «Отброшенные оценки» в «Итогах») и уходит клиенту ошибкой. */
  const reject = async (reason: RatingRejectReason, err: AppError): Promise<never> => {
    await logRejected(tasting.id, guest.id, input, reason);
    throw err;
  };

  if (tasting.status !== TASTING_STATUS.RUNNING) {
    const draft = tasting.status === TASTING_STATUS.DRAFT;
    await reject(
      draft ? RATING_REJECT_REASON.NOT_OPEN : RATING_REJECT_REASON.AFTER_CLOSE,
      conflict("TASTING_NOT_RUNNING", draft ? "Дегустация ещё не началась" : "Приём оценок завершён"),
    );
  }

  const tw = await db.tastingWine.findFirst({ where: { id: input.tastingWineId, tastingId: tasting.id } });
  if (!tw) return reject(RATING_REJECT_REASON.NOT_IN_PROGRAM, notFound("Вино не найдено в программе"));

  const duplicate = () => conflict("DUPLICATE_RATING", "Вы уже оценили это вино");
  const existing = await db.rating.findUnique({
    where: { guestId_tastingWineId: { guestId: guest.id, tastingWineId: tw.id } },
  });
  if (existing) await reject(RATING_REJECT_REASON.DUPLICATE, duplicate());

  if (tw.status !== WINE_STATUS.OPEN) {
    const pending = tw.status === WINE_STATUS.PENDING;
    await reject(
      pending ? RATING_REJECT_REASON.NOT_OPEN : RATING_REJECT_REASON.AFTER_CLOSE,
      conflict("WINE_NOT_OPEN", pending ? "Это вино ещё не открыто организатором" : "Вино уже закрыто организатором"),
    );
  }

  if (!isValidValue(tasting.scale, input.value)) {
    const { min, max, step } = getScale(tasting.scale);
    await reject(
      RATING_REJECT_REASON.OUT_OF_RANGE,
      unprocessable(
        "VALUE_OUT_OF_SCALE",
        `Оценка должна быть от ${formatScaleValue(tasting.scale, min)} до ${formatScaleValue(tasting.scale, max)} с шагом ${String(step).replace(".", ",")}`,
      ),
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
    if (isUniqueViolation(err)) return reject(RATING_REJECT_REASON.DUPLICATE, duplicate());
    throw err;
  }
}

/** Запись в журнал отказов; журнал ограничен LIMITS.REJECTED_LOG_MAX на дегустацию, чтобы спам не раздувал БД. */
async function logRejected(tastingId: string, guestId: string, input: RateInput, reason: RatingRejectReason) {
  if ((await db.rejectedRating.count({ where: { tastingId } })) >= LIMITS.REJECTED_LOG_MAX) return;
  await db.rejectedRating.create({
    data: {
      tastingId,
      guestId,
      tastingWineId: input.tastingWineId,
      value: Number.isFinite(input.value) ? input.value : null,
      reason,
    },
  });
}

/* ---------- Фото вина ---------- */

/**
 * Фото для гостя — по тому же правилу, что и данные вина: в слепом режиме только после раскрытия.
 * Ссылку на фото нераскрытого вина гость не получает, а прямой запрос даёт 404.
 */
export async function getImage(inviteCode: string, tastingWineId: string): Promise<{ mime: ImageMime; data: Uint8Array }> {
  const tasting = await requireTasting(inviteCode);
  const tw = await db.tastingWine.findFirst({
    where: { id: tastingWineId, tastingId: tasting.id },
    select: { wineId: true, revealedAt: true },
  });
  if (!tw || !isWineVisibleToGuest(tasting.mode, tw.revealedAt)) throw notFound("Фото нет");
  const image = await db.wineImage.findUnique({ where: { wineId: tw.wineId } });
  if (!image) throw notFound("Фото нет");
  return { mime: image.mime as ImageMime, data: image.data };
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
    const guestWine = toGuestTastingWineDTO(tasting, tw);
    return {
      tastingWineId: tw.id,
      position: tw.position,
      label: blindWineLabel(tw.position),
      wine: guestWine.wine,
      imageUrl: guestWine.imageUrl,
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
