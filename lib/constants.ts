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
  ORGANIZER_NAME_MIN: 2,
  ORGANIZER_NAME_MAX: 60,
  ORGANIZER_ORG_MAX: 80,
  ORGANIZER_CITY_MAX: 60,
  ORGANIZER_BIO_MAX: 200,
  NOTE_MAX: 500,
  WINE_NAME_MIN: 2,
  WINE_NAME_MAX: 160,
  WINE_TEXT_MAX: 120,
  VINTAGE_MIN: 1900,
  CATALOG_SEARCH_LIMIT: 50,
  EXPORT_MAX_WINES: 200,
  EXPORT_MAX_RATINGS: 20000,
  MIN_GUESTS_MAX: 100,
  /** Сколько отброшенных попыток храним на дегустацию — журнал не должен расти от спама. */
  REJECTED_LOG_MAX: 1000,
  /** Сколько последних отброшенных показываем в «Итогах». */
  REJECTED_SHOW_MAX: 200,
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

/* ---------- Организатор ---------- */

export const SESSION_COOKIE_NAME = "wt_org_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;
export const PASSWORD_MIN = 8;
/** bcrypt учитывает только первые 72 байта пароля. */
export const PASSWORD_MAX = 72;
export const EMAIL_MAX = 254;
export const BCRYPT_ROUNDS = 10;
/** Неудачных входов на пару «IP + email» за окно, потом 429. */
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** Демо-аккаунт: вход одной кнопкой без пароля (его создаёт seed или первый вход). Регистрировать этот email нельзя. */
export const DEMO_ORGANIZER_EMAIL = "demo@wine-tasting.local";
export const DEMO_ORGANIZER_PROFILE = {
  displayName: "Демо-организатор",
  organization: "Конструктор дегустаций",
  city: null,
  bio: "Публичный демо-аккаунт для знакомства с сервисом.",
} as const;

/* ---------- Лимиты запросов гостя (по IP + inviteCode, в памяти процесса) ----------
 * На дегустации гости часто сидят в одной Wi-Fi за одним внешним IP, поэтому лимиты рассчитаны
 * на зал целиком: 30 гостей входят за минуту и оценивают по вину. Бот, долбящий API, упирается быстро. */

export const GUEST_JOIN_LIMIT = { max: 30, windowMs: 60 * 1000 } as const;
export const GUEST_RATE_LIMIT = { max: 60, windowMs: 60 * 1000 } as const;

/** Интервал поллинга для экранов «Проведение» и анкеты гостя. */
export const POLL_INTERVAL_MS = 5000;

/* ---------- Демо (seed) ---------- */

/** Публичный демо-кабинет: ключ намеренно известен, это не секрет. */
export const DEMO_ADMIN_KEY = "demo-organizer-public-key";
export const DEMO_INVITE_CODE = "DEGUST";

/* ---------- Экспорт в рейтинг ---------- */

export const EXPORT_SCHEMA_VERSION = "1.1";
/** Версии, которые принимает импорт: 1.0 — без scale и normalized5 в оценках. */
export const IMPORT_SCHEMA_VERSIONS = ["1.0", "1.1"] as const;
export const EXPORT_SOURCE_SYSTEM = "wine-tasting-constructor";
/** Длина анонимного guestHash и хвоста exportId (hex-символов sha256). */
export const EXPORT_HASH_LENGTH = 32;
/** Допуск сверки normalized100 с пересчётом по шкале (половина последнего знака). */
export const NORMALIZED_TOLERANCE = 0.05;

/** Причины отклонения оценок — общие для экспорта и импорта (docs/rating-contract.md). */
export const REJECT_REASON = {
  SCALE_MISMATCH: "SCALE_MISMATCH",
  VALUE_OUT_OF_SCALE: "VALUE_OUT_OF_SCALE",
  UNKNOWN_TASTING_WINE: "UNKNOWN_TASTING_WINE",
  UNKNOWN_WINE: "UNKNOWN_WINE",
  NORMALIZATION_MISMATCH: "NORMALIZATION_MISMATCH",
  DUPLICATE_IN_EXPORT: "DUPLICATE_IN_EXPORT",
  ALREADY_IMPORTED: "ALREADY_IMPORTED",
  BELOW_MIN_GUESTS: "BELOW_MIN_GUESTS",
} as const;
export type RejectReason = (typeof REJECT_REASON)[keyof typeof REJECT_REASON];

export const REJECT_REASON_LABEL: Record<RejectReason, string> = {
  SCALE_MISMATCH: "оценка поставлена по другой шкале",
  VALUE_OUT_OF_SCALE: "значение вне шкалы",
  UNKNOWN_TASTING_WINE: "вино не из программы экспорта",
  UNKNOWN_WINE: "вина нет в каталоге рейтинга",
  NORMALIZATION_MISMATCH: "normalized100 не совпадает с пересчётом",
  DUPLICATE_IN_EXPORT: "повтор оценки гостя в одном экспорте",
  ALREADY_IMPORTED: "оценка уже есть в рейтинге",
  BELOW_MIN_GUESTS: "вино оценило меньше гостей, чем задано минимумом",
};
/** Причины, по которым гостю отказали в оценке, — журнал RejectedRating и таблица в «Итогах». */
export const RATING_REJECT_REASON = {
  OUT_OF_RANGE: "OUT_OF_RANGE",
  AFTER_CLOSE: "AFTER_CLOSE",
  NOT_OPEN: "NOT_OPEN",
  DUPLICATE: "DUPLICATE",
  NOT_IN_PROGRAM: "NOT_IN_PROGRAM",
} as const;
export type RatingRejectReason = (typeof RATING_REJECT_REASON)[keyof typeof RATING_REJECT_REASON];

export const RATING_REJECT_REASON_LABEL: Record<RatingRejectReason, string> = {
  OUT_OF_RANGE: "вне диапазона",
  AFTER_CLOSE: "после закрытия",
  NOT_OPEN: "вино ещё не открыто",
  DUPLICATE: "дубль",
  NOT_IN_PROGRAM: "вино не в программе",
};

/* ---------- Народный рейтинг ---------- */

/** Вино получает место в /rating, только если у него не меньше стольких оценок; иначе — «Мало оценок». */
export const MIN_RATINGS_FOR_RATING = 3;

/** Знаков после запятой для normalized100 и средних — одно место округления. */
export const SCORE_DECIMALS = 1;
