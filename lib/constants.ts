// Строковые перечисления и лимиты. Prisma enum не используем (SQLite) — значения живут здесь.
// Шкалы оценок — в lib/scales.ts.

const valuesOf = <T extends Record<string, string>>(obj: T) => Object.values(obj) as T[keyof T][];

/* ---------- Дегустация ---------- */

export const TASTING_STATUS = {
  DRAFT: "draft",
  RUNNING: "running",
  CLOSED: "closed",
  PUBLISHED: "published",
} as const;
export type TastingStatus = (typeof TASTING_STATUS)[keyof typeof TASTING_STATUS];
export const TASTING_STATUSES = valuesOf(TASTING_STATUS);

export const TASTING_STATUS_LABEL: Record<TastingStatus, string> = {
  draft: "Черновик",
  running: "Идёт",
  closed: "Завершена",
  published: "Итоги опубликованы",
};

/** Действия организатора над дегустацией и разрешённые переходы (PLAN.md §5). */
export const TASTING_ACTION = {
  START: "start",
  CLOSE: "close",
  PUBLISH: "publish",
} as const;
export type TastingAction = (typeof TASTING_ACTION)[keyof typeof TASTING_ACTION];
export const TASTING_ACTIONS = valuesOf(TASTING_ACTION);

export const TASTING_TRANSITIONS: Record<TastingAction, { from: TastingStatus; to: TastingStatus }> = {
  start: { from: "draft", to: "running" },
  close: { from: "running", to: "closed" },
  publish: { from: "closed", to: "published" },
};

export const TASTING_MODE = {
  OPEN: "open",
  BLIND: "blind",
} as const;
export type TastingMode = (typeof TASTING_MODE)[keyof typeof TASTING_MODE];
export const TASTING_MODES = valuesOf(TASTING_MODE);

export const TASTING_MODE_LABEL: Record<TastingMode, string> = {
  open: "Открытая",
  blind: "Слепая",
};

/* ---------- Вино в программе ---------- */

export const WINE_STATUS = {
  PENDING: "pending",
  OPEN: "open",
  CLOSED: "closed",
} as const;
export type WineStatus = (typeof WINE_STATUS)[keyof typeof WINE_STATUS];
export const WINE_STATUSES = valuesOf(WINE_STATUS);

export const WINE_STATUS_LABEL: Record<WineStatus, string> = {
  pending: "Ожидает",
  open: "Оценивается",
  closed: "Закрыто",
};

export const WINE_ACTION = {
  OPEN: "open",
  CLOSE: "close",
} as const;
export type WineAction = (typeof WINE_ACTION)[keyof typeof WINE_ACTION];
export const WINE_ACTIONS = valuesOf(WINE_ACTION);

/** Из каких статусов разрешено действие. closed → open запрещено. */
export const WINE_TRANSITIONS: Record<WineAction, { from: WineStatus[]; to: WineStatus }> = {
  open: { from: ["pending"], to: "open" },
  close: { from: ["pending", "open"], to: "closed" },
};

/* ---------- Каталог вин ---------- */

export const WINE_COLOR = {
  RED: "red",
  WHITE: "white",
  ROSE: "rose",
  SPARKLING: "sparkling",
  ORANGE: "orange",
  FORTIFIED: "fortified",
} as const;
export type WineColor = (typeof WINE_COLOR)[keyof typeof WINE_COLOR];
export const WINE_COLORS = valuesOf(WINE_COLOR);

export const WINE_COLOR_LABEL: Record<WineColor, string> = {
  red: "Красное",
  white: "Белое",
  rose: "Розовое",
  sparkling: "Игристое",
  orange: "Оранжевое",
  fortified: "Креплёное",
};

/** Подпись вина для гостя, пока бутылка не раскрыта. */
export const blindWineLabel = (position: number) => `Вино №${position}`;

/* ---------- Лимиты ---------- */

export const LIMITS = {
  TITLE_MIN: 3,
  TITLE_MAX: 120,
  DESCRIPTION_MAX: 1000,
  LOCATION_MAX: 200,
  DISPLAY_NAME_MAX: 40,
  NOTE_MAX: 500,
  WINE_NAME_MIN: 2,
  WINE_NAME_MAX: 160,
  WINE_TEXT_MAX: 120,
  VINTAGE_MIN: 1900,
  CATALOG_SEARCH_LIMIT: 50,
} as const;

/* ---------- Ключи и коды ---------- */

/** Без похожих символов (O/0, I/1), чтобы код легко продиктовать. */
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 6;
export const ADMIN_KEY_BYTES = 32;
export const GUEST_TOKEN_BYTES = 32;
export const KEY_GENERATION_ATTEMPTS = 5;

/* ---------- Гость ---------- */

export const GUEST_COOKIE_PREFIX = "wt_g_";
export const guestCookieName = (inviteCode: string) => `${GUEST_COOKIE_PREFIX}${inviteCode}`;
export const GUEST_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** Интервал поллинга для экранов «Проведение» и анкеты гостя. */
export const POLL_INTERVAL_MS = 5000;

/* ---------- Демо (seed) ---------- */

/** Публичный демо-кабинет: ключ намеренно известен, это не секрет. */
export const DEMO_ADMIN_KEY = "demo-organizer-public-key";
export const DEMO_INVITE_CODE = "DEGUST";

/* ---------- Экспорт в рейтинг ---------- */

export const EXPORT_SCHEMA_VERSION = "1.0";
/** Знаков после запятой для normalized100 и средних — одно место округления. */
export const SCORE_DECIMALS = 1;
