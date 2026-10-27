// zod-схемы всех входов API. Роуты только парсят ими тело; бизнес-правила — в services/.
// Диапазон значения оценки здесь НЕ проверяется: он зависит от шкалы дегустации → 422 в guestService.

import { z } from "zod";
import { LIMITS, TASTING_ACTIONS, TASTING_MODES, WINE_ACTIONS, WINE_COLORS } from "./constants";
import { SCALE_IDS } from "./scales";

/** Необязательный текст: обрезаем пробелы, пустую строку превращаем в null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `не длиннее ${max} символов`)
    .nullish()
    .transform((v) => (v ? v : null));

const title = z
  .string({ required_error: "укажите название" })
  .trim()
  .min(LIMITS.TITLE_MIN, `название — от ${LIMITS.TITLE_MIN} символов`)
  .max(LIMITS.TITLE_MAX, `название — до ${LIMITS.TITLE_MAX} символов`);

const startsAt = z
  .string()
  .datetime({ offset: true, message: "некорректная дата" })
  .nullish()
  .transform((v) => (v ? new Date(v) : null));

/** z.enum из массива констант с сохранением литерального типа. */
const enumOf = <T extends string>(values: readonly T[], message: string) => z.enum(values as [T, ...T[]], { message });

const mode = enumOf(TASTING_MODES, "режим: open или blind");
const scale = enumOf(SCALE_IDS, "неизвестная шкала");

/* ---------- Организатор ---------- */

const tastingFields = {
  title,
  description: optionalText(LIMITS.DESCRIPTION_MAX),
  location: optionalText(LIMITS.LOCATION_MAX),
  startsAt,
  mode,
  scale,
  notesEnabled: z.boolean(),
};

export const createTastingSchema = z.object({
  ...tastingFields,
  notesEnabled: tastingFields.notesEnabled.default(true),
});
export type CreateTastingInput = z.infer<typeof createTastingSchema>;

export const updateTastingSchema = z
  .object(tastingFields)
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "нет полей для изменения" });
export type UpdateTastingInput = z.infer<typeof updateTastingSchema>;

const id = z.string().trim().min(1, "не указан id").max(64);

export const addWineSchema = z.object({ wineId: id });

export const reorderSchema = z.object({
  orderedIds: z.array(id).min(1, "пустой список").max(200),
});

export const tastingActionSchema = z.object({
  action: enumOf(TASTING_ACTIONS, "действие: start, close или publish"),
});

export const wineActionSchema = z.object({
  action: enumOf(WINE_ACTIONS, "действие: open или close"),
});

/* ---------- Каталог ---------- */

export const wineSearchSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
});

export const createWineSchema = z.object({
  name: z
    .string({ required_error: "укажите название вина" })
    .trim()
    .min(LIMITS.WINE_NAME_MIN, `название — от ${LIMITS.WINE_NAME_MIN} символов`)
    .max(LIMITS.WINE_NAME_MAX, `название — до ${LIMITS.WINE_NAME_MAX} символов`),
  producer: optionalText(LIMITS.WINE_TEXT_MAX),
  vintage: z
    .number()
    .int("год — целое число")
    .min(LIMITS.VINTAGE_MIN, `год — не раньше ${LIMITS.VINTAGE_MIN}`)
    .refine((y) => y <= new Date().getFullYear(), "год — не позже текущего")
    .nullish()
    .transform((v) => v ?? null),
  region: optionalText(LIMITS.WINE_TEXT_MAX),
  country: optionalText(LIMITS.WINE_TEXT_MAX),
  grape: optionalText(LIMITS.WINE_TEXT_MAX),
  color: enumOf(WINE_COLORS, "неизвестный цвет вина")
    .nullish()
    .transform((v) => v ?? null),
  priceRub: z
    .number()
    .int("цена — целое число")
    .min(0, "цена не может быть отрицательной")
    .nullish()
    .transform((v) => v ?? null),
});
export type CreateWineInput = z.infer<typeof createWineSchema>;

/* ---------- Гость ---------- */

export const joinSchema = z.object({
  displayName: optionalText(LIMITS.DISPLAY_NAME_MAX),
});

export const rateSchema = z.object({
  tastingWineId: id,
  value: z.number({ required_error: "поставьте оценку", invalid_type_error: "оценка — число" }),
  note: optionalText(LIMITS.NOTE_MAX),
});
export type RateInput = z.infer<typeof rateSchema>;
