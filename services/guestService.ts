// Гость: вход по коду, анкета (blind-safe), оценка с защитой от дублей (PLAN.md U6–U9).
// Гость идентифицируется cookie-токеном; в БД хранится только sha256 от него.

import type { Guest, Tasting } from "@prisma/client";
import { generateGuestToken, normalizeInviteCode, sha256 } from "@/lib/auth";
import { TASTING_STATUS, WINE_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  isWineVisibleToGuest,
  toGuestRatingDTO,
  toGuestTastingDTO,
  type GuestRatingDTO,
  type GuestTastingDTO,
} from "@/lib/dto";
import { conflict, isUniqueViolation, notFound, unauthorized, unprocessable } from "@/lib/http";
import { formatScaleValue, getScale, isValidValue } from "@/lib/scales";
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

export async function findGuestView(inviteCode: string, token: string | null): Promise<GuestTastingDTO | null> {
  const tasting = await findTasting(inviteCode);
  if (!tasting) return null;

  // Слепой режим: программу читаем БЕЗ include wine. Данные вин подгружаем отдельным запросом
  // и только для видимых гостю (открытый режим или бутылка раскрыта) — остальные не покидают БД.
  const program = await db.tastingWine.findMany({ where: { tastingId: tasting.id }, orderBy: { position: "asc" } });
  const visibleWineIds = program
    .filter((tw) => isWineVisibleToGuest(tasting.mode, tw.revealedAt))
    .map((tw) => tw.wineId);
  const visibleWines = visibleWineIds.length ? await db.wine.findMany({ where: { id: { in: visibleWineIds } } }) : [];
  const wineById = new Map(visibleWines.map((w) => [w.id, w]));

  const guest = await findGuest(tasting, token);
  const ratings = guest ? await db.rating.findMany({ where: { guestId: guest.id } }) : [];

  return toGuestTastingDTO(
    tasting,
    program.map((tw) => ({ ...tw, wine: wineById.get(tw.wineId) ?? null })),
    guest,
    ratings,
  );
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
