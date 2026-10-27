// Дегустация глазами организатора: создание, настройки, программа, переходы статусов (PLAN.md §5).
// Доступ = знание adminKey. Все функции возвращают DTO, а не сущности Prisma.

import type { Prisma, Tasting } from "@prisma/client";
import { generateAdminKey, generateInviteCode } from "@/lib/auth";
import {
  KEY_GENERATION_ATTEMPTS,
  TASTING_MODE,
  TASTING_STATUS,
  TASTING_STATUS_LABEL,
  TASTING_TRANSITIONS,
  WINE_STATUS,
  WINE_TRANSITIONS,
  type TastingAction,
  type TastingStatus,
  type WineAction,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { toOrgTastingDTO, type OrgTastingDTO } from "@/lib/dto";
import { AppError, conflict, isUniqueViolation, notFound } from "@/lib/http";
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

export async function findOrgTasting(adminKey: string): Promise<OrgTastingDTO | null> {
  const tasting = await db.tasting.findUnique({ where: { adminKey }, include: orgInclude });
  return tasting ? toOrgTastingDTO(tasting) : null;
}

export async function getOrgTasting(adminKey: string): Promise<OrgTastingDTO> {
  const dto = await findOrgTasting(adminKey);
  if (!dto) throw notFound("Ссылка организатора недействительна");
  return dto;
}

/* ---------- Создание и настройки ---------- */

export async function create(input: CreateTastingInput): Promise<{ id: string; adminKey: string; inviteCode: string }> {
  for (let attempt = 0; attempt < KEY_GENERATION_ATTEMPTS; attempt++) {
    try {
      const tasting = await db.tasting.create({
        data: { ...input, status: TASTING_STATUS.DRAFT, adminKey: generateAdminKey(), inviteCode: generateInviteCode() },
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
