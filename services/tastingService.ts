// Дегустация глазами организатора: создание, настройки, программа, переходы статусов (PLAN.md §5),
// раскрытие бутылок, гости (удаление гостя и оценки) и сводка с валидностью.
// Доступ к кабинету = знание adminKey (аккаунт организатора только даёт список своих дегустаций).
// Все функции возвращают DTO, а не сущности Prisma.

import type { Prisma, Tasting } from "@prisma/client";
import { generateAdminKey, generateInviteCode } from "@/lib/auth";
import {
  blindWineLabel,
  KEY_GENERATION_ATTEMPTS,
  LIMITS,
  TASTING_MODE,
  TASTING_STATUS,
  TASTING_STATUS_LABEL,
  TASTING_TRANSITIONS,
  WINE_STATUS,
  WINE_TRANSITIONS,
  type RatingRejectReason,
  type TastingAction,
  type TastingStatus,
  type WineAction,
  type WineStatus,
} from "@/lib/constants";
import { db } from "@/lib/db";
import {
  toMyTastingDTO,
  toOrgTastingDTO,
  toPublicOrganizerDTO,
  toWineDTO,
  type MyTastingDTO,
  type OrgGuestDTO,
  type OrgTastingDTO,
  type PrintInfoDTO,
  type SummaryDTO,
} from "@/lib/dto";
import { AppError, conflict, isUniqueViolation, notFound } from "@/lib/http";
import { isValidValue, type ScaleId } from "@/lib/scales";
import { groupBy, rankByScore, wineStats } from "@/lib/stats";
import type { CreateTastingInput, UpdateTastingInput } from "@/lib/validation";

const orgInclude = {
  wines: { include: { wine: true, _count: { select: { ratings: true } } }, orderBy: { position: "asc" } },
  _count: { select: { guests: true, ratings: true } },
} satisfies Prisma.TastingInclude;

async function requireTasting(adminKey: string): Promise<Tasting> {
  const tasting = await db.tasting.findUnique({ where: { adminKey } });
  if (!tasting) throw notFound("Ссылка организатора недействительна");
  return tasting;
}

/** Настройки и программу можно менять только в черновике. */
function requireDraft(tasting: Tasting, what: string) {
  if (tasting.status !== TASTING_STATUS.DRAFT) {
    throw conflict("NOT_DRAFT", `${what} можно менять только до запуска дегустации`);
  }
}

async function loadOrgDTO(tastingId: string): Promise<OrgTastingDTO> {
  return toOrgTastingDTO(await db.tasting.findUniqueOrThrow({ where: { id: tastingId }, include: orgInclude }));
}

/* ---------- Чтение ---------- */

export async function exists(adminKey: string): Promise<boolean> {
  return (await db.tasting.count({ where: { adminKey } })) > 0;
}

export async function findOrgTasting(adminKey: string): Promise<OrgTastingDTO | null> {
  const tasting = await db.tasting.findUnique({ where: { adminKey }, include: orgInclude });
  return tasting ? toOrgTastingDTO(tasting) : null;
}

export async function getOrgTasting(adminKey: string): Promise<OrgTastingDTO> {
  const dto = await findOrgTasting(adminKey);
  if (!dto) throw notFound("Ссылка организатора недействительна");
  return dto;
}

/** Листок для печати: название, место, организатор и код — всё, что гость увидит и на экране входа. */
export async function findPrintInfo(adminKey: string): Promise<PrintInfoDTO | null> {
  const tasting = await db.tasting.findUnique({
    where: { adminKey },
    include: { owner: { select: { displayName: true, organization: true, city: true } } },
  });
  if (!tasting) return null;
  return {
    title: tasting.title,
    location: tasting.location,
    startsAt: tasting.startsAt?.toISOString() ?? null,
    inviteCode: tasting.inviteCode,
    organizer: toPublicOrganizerDTO(tasting.owner),
  };
}

/** «Мои дегустации»: новые сверху. */
export async function listByOwner(ownerId: string): Promise<MyTastingDTO[]> {
  const rows = await db.tasting.findMany({
    where: { ownerId },
    select: { adminKey: true, title: true, status: true, isDemo: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toMyTastingDTO);
}

/* ---------- Создание и настройки ---------- */

/** ownerId — организатор, если создаёт залогиненный; без аккаунта дегустация доступна только по adminKey. */
export async function create(
  input: CreateTastingInput,
  ownerId: string | null,
): Promise<{ id: string; adminKey: string; inviteCode: string }> {
  for (let attempt = 0; attempt < KEY_GENERATION_ATTEMPTS; attempt++) {
    try {
      const tasting = await db.tasting.create({
        data: {
          ...input,
          ownerId,
          status: TASTING_STATUS.DRAFT,
          adminKey: generateAdminKey(),
          inviteCode: generateInviteCode(),
        },
      });
      return { id: tasting.id, adminKey: tasting.adminKey, inviteCode: tasting.inviteCode };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err; // коллизия inviteCode/adminKey — генерируем заново
    }
  }
  throw new AppError(500, "KEY_GENERATION_FAILED", "Не удалось создать дегустацию, попробуйте ещё раз");
}

export async function update(adminKey: string, input: UpdateTastingInput): Promise<OrgTastingDTO> {
  const tasting = await requireTasting(adminKey);
  requireDraft(tasting, "Настройки");
  await db.tasting.update({ where: { id: tasting.id }, data: input });
  return loadOrgDTO(tasting.id);
}

/* ---------- Программа ---------- */

export async function addWine(adminKey: string, wineId: string): Promise<OrgTastingDTO> {
  const tasting = await requireTasting(adminKey);
  requireDraft(tasting, "Программу");

  const wine = await db.wine.findUnique({ where: { id: wineId }, select: { id: true } });
  if (!wine) throw notFound("Вино не найдено в каталоге");

  const duplicate = () => conflict("DUPLICATE_WINE", "Это вино уже есть в программе");
  if (await db.tastingWine.findUnique({ where: { tastingId_wineId: { tastingId: tasting.id, wineId } } })) {
    throw duplicate();
  }

  try {
    await db.$transaction(async (tx) => {
      const last = await tx.tastingWine.findFirst({
        where: { tastingId: tasting.id },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      await tx.tastingWine.create({ data: { tastingId: tasting.id, wineId, position: (last?.position ?? 0) + 1 } });
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // Гонка: то же вино добавили параллельно, либо заняли ту же позицию.
    const exists = await db.tastingWine.findUnique({ where: { tastingId_wineId: { tastingId: tasting.id, wineId } } });
    throw exists ? duplicate() : conflict("PROGRAM_CHANGED", "Программа изменилась, попробуйте ещё раз");
  }
  return loadOrgDTO(tasting.id);
}

export async function removeWine(adminKey: string, tastingWineId: string): Promise<OrgTastingDTO> {
  const tasting = await requireTasting(adminKey);
  requireDraft(tasting, "Программу");

  const target = await db.tastingWine.findFirst({ where: { id: tastingWineId, tastingId: tasting.id } });
  if (!target) throw notFound("Вино не найдено в программе");

  await db.$transaction(async (tx) => {
    await tx.tastingWine.delete({ where: { id: target.id } });
    // Номера «Вино №N» остаются непрерывными: сдвигаем хвост по одному, по возрастанию —
    // каждая следующая позиция освобождается предыдущим шагом, UNIQUE не нарушается.
    const tail = await tx.tastingWine.findMany({
      where: { tastingId: tasting.id, position: { gt: target.position } },
      orderBy: { position: "asc" },
    });
    for (const tw of tail) {
      await tx.tastingWine.update({ where: { id: tw.id }, data: { position: tw.position - 1 } });
    }
  });
  return loadOrgDTO(tasting.id);
}

/** Новый порядок программы: orderedIds — перестановка всех id вин программы. */
export async function reorder(adminKey: string, orderedIds: string[]): Promise<OrgTastingDTO> {
  const tasting = await requireTasting(adminKey);
  requireDraft(tasting, "Программу");

  await db.$transaction(async (tx) => {
    const current = await tx.tastingWine.findMany({ where: { tastingId: tasting.id }, select: { id: true } });
    const currentIds = new Set(current.map((tw) => tw.id));
    const isPermutation =
      orderedIds.length === currentIds.size &&
      new Set(orderedIds).size === orderedIds.length &&
      orderedIds.every((id) => currentIds.has(id));
    if (!isPermutation) throw conflict("PROGRAM_CHANGED", "Программа изменилась — обновите страницу");

    // Через временные отрицательные позиции, чтобы не задеть UNIQUE(tastingId, position).
    for (const [i, id] of orderedIds.entries()) {
      await tx.tastingWine.update({ where: { id }, data: { position: -(i + 1) } });
    }
    for (const [i, id] of orderedIds.entries()) {
      await tx.tastingWine.update({ where: { id }, data: { position: i + 1 } });
    }
  });
  return loadOrgDTO(tasting.id);
}

/* ---------- Удаление ---------- */

/**
 * Удаление дегустации со всей программой, гостями и оценками (cascade). Оценки, уже переданные
 * в «Народный рейтинг», остаются: рейтинг — отдельная система и хранит их без ссылки на дегустацию.
 * Демо-дегустацию удалить нельзя: её ссылка публичная.
 */
export async function remove(adminKey: string): Promise<void> {
  const tasting = await requireTasting(adminKey);
  if (tasting.isDemo) throw conflict("DEMO_TASTING", "Демо-дегустацию удалить нельзя");
  await db.tasting.delete({ where: { id: tasting.id } });
}

/** Фото в каталог можно загружать из кабинета любой дегустации, кроме демо (её ссылка публичная). */
export async function requireCatalogEditor(adminKey: string): Promise<void> {
  const tasting = await requireTasting(adminKey);
  if (tasting.isDemo) throw conflict("DEMO_TASTING", "В демо-кабинете фото каталога менять нельзя");
}

/* ---------- Переходы статусов ---------- */

const ACTION_VERB: Record<TastingAction, string> = {
  start: "запустить",
  close: "завершить",
  publish: "опубликовать итоги",
};

export async function setStatus(adminKey: string, action: TastingAction): Promise<OrgTastingDTO> {
  const tasting = await requireTasting(adminKey);
  const { from, to } = TASTING_TRANSITIONS[action];
  const invalid = () =>
    conflict(
      "INVALID_TRANSITION",
      `Нельзя ${ACTION_VERB[action]}: дегустация в статусе «${TASTING_STATUS_LABEL[tasting.status as TastingStatus]}»`,
    );
  if (tasting.status !== from) throw invalid();

  const now = new Date();
  await db.$transaction(async (tx) => {
    if (action === "start") {
      const count = await tx.tastingWine.count({ where: { tastingId: tasting.id } });
      if (count === 0) throw conflict("NO_WINES", "Добавьте в программу хотя бы одно вино");
    }
    if (action === "close") {
      await tx.tastingWine.updateMany({
        where: { tastingId: tasting.id, status: { not: WINE_STATUS.CLOSED } },
        data: { status: WINE_STATUS.CLOSED, closedAt: now },
      });
    }
    if (action === "publish" && tasting.mode === TASTING_MODE.BLIND) {
      const hidden = await tx.tastingWine.count({ where: { tastingId: tasting.id, revealedAt: null } });
      if (hidden > 0) throw conflict("NOT_ALL_REVEALED", "Сначала раскройте все бутылки");
    }

    const stamp =
      action === "start" ? { startedAt: now } : action === "close" ? { closedAt: now } : { publishedAt: now };
    // Условие по текущему статусу защищает от двойного нажатия и параллельных запросов.
    const { count } = await tx.tasting.updateMany({ where: { id: tasting.id, status: from }, data: { status: to, ...stamp } });
    if (count === 0) throw invalid();
  });
  return loadOrgDTO(tasting.id);
}

export async function setWineStatus(adminKey: string, tastingWineId: string, action: WineAction): Promise<OrgTastingDTO> {
  const tasting = await requireTasting(adminKey);
  if (tasting.status !== TASTING_STATUS.RUNNING) {
    throw conflict("TASTING_NOT_RUNNING", "Открывать и закрывать вина можно только во время дегустации");
  }
  const tw = await db.tastingWine.findFirst({ where: { id: tastingWineId, tastingId: tasting.id } });
  if (!tw) throw notFound("Вино не найдено в программе");

  const { from, to } = WINE_TRANSITIONS[action];
  const now = new Date();
  const { count } = await db.tastingWine.updateMany({
    where: { id: tw.id, status: { in: from } },
    data: action === "open" ? { status: to, openedAt: now } : { status: to, closedAt: now },
  });
  if (count === 0) {
    const message =
      tw.status === WINE_STATUS.CLOSED
        ? action === "open"
          ? "Закрытое вино нельзя открыть повторно"
          : "Вино уже закрыто"
        : "Вино уже открыто";
    throw conflict("INVALID_WINE_TRANSITION", message);
  }
  return loadOrgDTO(tasting.id);
}

/* ---------- Раскрытие бутылок ---------- */

/** Раскрытие — только в слепой дегустации, пока она идёт или завершена (после публикации всё уже раскрыто). */
function requireRevealable(tasting: Tasting) {
  if (tasting.mode !== TASTING_MODE.BLIND) {
    throw conflict("NOT_BLIND", "В открытой дегустации названия вин гостям и так видны");
  }
  if (tasting.status === TASTING_STATUS.PUBLISHED) {
    throw conflict("ALREADY_PUBLISHED", "Итоги уже опубликованы — все бутылки раскрыты");
  }
  if (tasting.status === TASTING_STATUS.DRAFT) {
    throw conflict("TASTING_NOT_STARTED", "Дегустация ещё не началась");
  }
}

/**
 * «Раскрыть вино №N» — только после закрытия голосования по этому вину: иначе гость, ещё не оценивший
 * вино, увидит название. Повторное раскрытие — не ошибка (двойной клик): дата не меняется.
 */
export async function reveal(adminKey: string, tastingWineId: string): Promise<OrgTastingDTO> {
  const tasting = await requireTasting(adminKey);
  requireRevealable(tasting);
  const tw = await db.tastingWine.findFirst({ where: { id: tastingWineId, tastingId: tasting.id } });
  if (!tw) throw notFound("Вино не найдено в программе");
  if (tw.status !== WINE_STATUS.CLOSED) {
    throw conflict("WINE_NOT_CLOSED", `Сначала закройте голосование по ${blindWineLabel(tw.position)}`);
  }
  // Закрытое вино открыть заново нельзя, так что проверка статуса выше не устаревает.
  await db.tastingWine.updateMany({ where: { id: tw.id, revealedAt: null }, data: { revealedAt: new Date() } });
  return loadOrgDTO(tasting.id);
}

/** «Раскрыть всё» — только когда голосование закрыто по всем винам. */
export async function revealAll(adminKey: string): Promise<OrgTastingDTO> {
  const tasting = await requireTasting(adminKey);
  requireRevealable(tasting);
  const notClosed = await db.tastingWine.count({ where: { tastingId: tasting.id, status: { not: WINE_STATUS.CLOSED } } });
  if (notClosed > 0) {
    throw conflict("NOT_ALL_CLOSED", "Раскрыть всё можно, когда голосование закрыто по всем винам");
  }
  await db.tastingWine.updateMany({ where: { tastingId: tasting.id, revealedAt: null }, data: { revealedAt: new Date() } });
  return loadOrgDTO(tasting.id);
}

/* ---------- Гости ---------- */

/** Гости с их оценками — для списка в «Проведении». */
export async function listGuests(adminKey: string): Promise<OrgGuestDTO[]> {
  const tasting = await requireTasting(adminKey);
  const guests = await db.guest.findMany({
    where: { tastingId: tasting.id },
    include: { ratings: { include: { tastingWine: { select: { position: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  return guests.map((g) => ({
    id: g.id,
    displayName: g.displayName,
    createdAt: g.createdAt.toISOString(),
    ratings: g.ratings
      .map((r) => ({ id: r.id, tastingWineId: r.tastingWineId, position: r.tastingWine.position, value: r.value }))
      .sort((a, b) => a.position - b.position),
  }));
}

/**
 * Удалять гостей и оценки можно, пока итоги не опубликованы и оценки не ушли в рейтинг:
 * иначе публичные итоги и рейтинг разойдутся с кабинетом.
 */
async function requireVotesEditable(tasting: Tasting) {
  if (tasting.status === TASTING_STATUS.PUBLISHED) {
    throw conflict("ALREADY_PUBLISHED", "Итоги уже опубликованы — удалять гостей и оценки нельзя");
  }
  if (await db.ratingImport.count({ where: { sourceTastingId: tasting.id } })) {
    throw conflict("ALREADY_EXPORTED", "Оценки уже переданы в рейтинг — удалять гостей и оценки нельзя");
  }
}

/** Удаление гостя вместе с его оценками (cascade). Его cookie перестаёт действовать. */
export async function deleteGuest(adminKey: string, guestId: string): Promise<OrgTastingDTO> {
  const tasting = await requireTasting(adminKey);
  await requireVotesEditable(tasting);
  const { count } = await db.guest.deleteMany({ where: { id: guestId, tastingId: tasting.id } });
  if (count === 0) throw notFound("Гость не найден");
  return loadOrgDTO(tasting.id);
}

/** Удаление одной оценки. Если вино ещё открыто, гость сможет оценить его заново. */
export async function deleteRating(adminKey: string, ratingId: string): Promise<OrgTastingDTO> {
  const tasting = await requireTasting(adminKey);
  await requireVotesEditable(tasting);
  const { count } = await db.rating.deleteMany({ where: { id: ratingId, tastingId: tasting.id } });
  if (count === 0) throw notFound("Оценка не найдена");
  return loadOrgDTO(tasting.id);
}

/* ---------- Сводка ---------- */

/** Сводка по винам: число голосов, среднее, разброс, avg100, места и заметки без имён. */
export async function summary(adminKey: string): Promise<SummaryDTO> {
  const tasting = await requireTasting(adminKey);
  const [program, ratings, guestsCount, rejected, rejectedTotal] = await Promise.all([
    db.tastingWine.findMany({ where: { tastingId: tasting.id }, include: { wine: true }, orderBy: { position: "asc" } }),
    db.rating.findMany({
      where: { tastingId: tasting.id },
      select: { tastingWineId: true, value: true, scale: true, note: true },
      orderBy: { createdAt: "asc" },
    }),
    db.guest.count({ where: { tastingId: tasting.id } }),
    db.rejectedRating.findMany({
      where: { tastingId: tasting.id },
      include: { guest: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: LIMITS.REJECTED_SHOW_MAX,
    }),
    db.rejectedRating.count({ where: { tastingId: tasting.id } }),
  ]);

  const byWine = groupBy(ratings, (r) => r.tastingWineId);
  const positionOf = new Map(program.map((tw) => [tw.id, tw.position]));
  // Те же правила, что в exportService.build: что здесь «валидно», то и уйдёт в рейтинг.
  let validRatings = 0;
  const rows = program.map((tw) => {
    const own = byWine.get(tw.id) ?? [];
    const belowMinGuests = own.length < tasting.minGuests;
    if (!belowMinGuests) {
      validRatings += own.filter((r) => r.scale === tasting.scale && isValidValue(tasting.scale, r.value)).length;
    }
    return {
      tastingWineId: tw.id,
      position: tw.position,
      label: blindWineLabel(tw.position),
      status: tw.status as WineStatus,
      revealed: tw.revealedAt !== null,
      wine: toWineDTO(tw.wine),
      ...wineStats(tasting.scale, own.map((r) => r.value)),
      notes: own.map((r) => r.note).filter((n): n is string => Boolean(n)),
      belowMinGuests,
    };
  });

  return {
    scale: tasting.scale as ScaleId,
    status: tasting.status as TastingStatus,
    guestsCount,
    totalRatings: ratings.length,
    wines: rankByScore(rows, (r) => r.avg100),
    minGuests: tasting.minGuests,
    validRatings,
    rejectedTotal,
    rejected: rejected.map((r) => ({
      id: r.id,
      position: positionOf.get(r.tastingWineId) ?? null,
      guestName: r.guest?.displayName ?? null,
      value: r.value,
      reason: r.reason as RatingRejectReason,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
