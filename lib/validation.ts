// zod-схемы всех входов API. Роуты только парсят ими тело; бизнес-правила — в services/.
// Диапазон значения оценки здесь НЕ проверяется: он зависит от шкалы дегустации → 422 в guestService.

import { z } from "zod";
import {
  EMAIL_MAX,
  EXPORT_SOURCE_SYSTEM,
  IMPORT_SCHEMA_VERSIONS,
  LIMITS,
  PASSWORD_MAX,
  PASSWORD_MIN,
  TASTING_ACTIONS,
  TASTING_MODES,
  WINE_ACTIONS,
  WINE_COLORS,
} from "./constants";
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

/* ---------- Аккаунт организатора ---------- */

const email = z
  .string({ required_error: "укажите email" })
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX, "слишком длинный email")
  .email("некорректный email");

export const registerSchema = z.object({
  email,
  password: z
    .string({ required_error: "придумайте пароль" })
    .min(PASSWORD_MIN, `пароль — от ${PASSWORD_MIN} символов`)
    .max(PASSWORD_MAX, `пароль — до ${PASSWORD_MAX} символов`),
});

// При входе длину пароля не проверяем: правило могло измениться после регистрации.
export const loginSchema = z.object({
  email,
  password: z.string({ required_error: "введите пароль" }).min(1, "введите пароль").max(200),
});
export type CredentialsInput = z.infer<typeof loginSchema>;

/* ---------- Организатор ---------- */

const tastingFields = {
  title,
  description: optionalText(LIMITS.DESCRIPTION_MAX),
  location: optionalText(LIMITS.LOCATION_MAX),
  startsAt,
  mode,
  scale,
  notesEnabled: z.boolean(),
  minGuests: z
    .number({ invalid_type_error: "минимум гостей — число" })
    .int("минимум гостей — целое число")
    .min(0, "минимум гостей не может быть отрицательным")
    .max(LIMITS.MIN_GUESTS_MAX, `минимум гостей — не больше ${LIMITS.MIN_GUESTS_MAX}`),
};

export const createTastingSchema = z.object({
  ...tastingFields,
  notesEnabled: tastingFields.notesEnabled.default(true),
  minGuests: tastingFields.minGuests.default(0),
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

/* ---------- Импорт в «Народный винный рейтинг» (docs/rating-contract.md) ----------
 * Без trim и transform: payloadHash считается от разобранного тела, оно не должно «нормализоваться». */

const nullableText = (max: number) => z.string().max(max).nullable();

export const ratingExportSchema = z.object({
  schemaVersion: z.enum(IMPORT_SCHEMA_VERSIONS, {
    errorMap: () => ({ message: `поддерживаются schemaVersion ${IMPORT_SCHEMA_VERSIONS.map((v) => `"${v}"`).join(", ")}` }),
  }),
  exportId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "exportId — 8..64 символов [A-Za-z0-9_-]"),
  source: z.object({
    system: z.literal(EXPORT_SOURCE_SYSTEM, { errorMap: () => ({ message: "неизвестная система-источник" }) }),
    tastingId: id,
    title: z.string().min(1).max(LIMITS.TITLE_MAX),
    mode,
    closedAt: z.string().datetime({ offset: true, message: "closedAt — дата ISO 8601 (дегустация должна быть завершена)" }),
    scale: z.object({
      id: scale,
      min: z.number(),
      max: z.number(),
      step: z.number().positive(),
    }),
  }),
  wines: z
    .array(
      z.object({
        tastingWineId: id,
        position: z.number().int().min(1),
        wineId: id,
        name: z.string().min(1).max(LIMITS.WINE_NAME_MAX),
        producer: nullableText(LIMITS.WINE_TEXT_MAX),
        vintage: z.number().int().nullable(),
        region: nullableText(LIMITS.WINE_TEXT_MAX),
        country: nullableText(LIMITS.WINE_TEXT_MAX),
        grape: nullableText(LIMITS.WINE_TEXT_MAX),
        color: enumOf(WINE_COLORS, "неизвестный цвет вина").nullable(),
      }),
    )
    .min(1, "в экспорте нет вин")
    .max(LIMITS.EXPORT_MAX_WINES),
  ratings: z
    .array(
      z.object({
        guestHash: z.string().regex(/^[0-9a-f]{32}$/, "guestHash — 32 hex-символа"),
        tastingWineId: id,
        value: z.number(),
        normalized100: z.number(),
        // С версии 1.1; в 1.0 их нет.
        scale: scale.optional(),
        normalized5: z.number().optional(),
      }),
    )
    .max(LIMITS.EXPORT_MAX_RATINGS),
  stats: z.object({
    totalRatings: z.number().int().min(0),
    exportedRatings: z.number().int().min(0),
    rejected: z.array(z.object({ reason: z.string().min(1).max(64), count: z.number().int().min(1) })).max(50),
  }),
});
export type RatingExportInput = z.infer<typeof ratingExportSchema>;
