// DTO — всё, что уходит из сервера наружу (API-ответы и props client components).
// Мапперы собирают объекты ЯВНЫМ списком полей (никаких spread), чтобы в ответ
// случайно не попали adminKey, tokenHash или данные нераскрытого вина.

import type { Guest, Rating, Tasting, TastingWine, Wine } from "@prisma/client";
import {
  blindWineLabel,
  TASTING_MODE,
  type TastingMode,
  type TastingStatus,
  type WineColor,
  type WineStatus,
} from "./constants";
import type { ScaleId } from "./scales";

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/* ================================================================
 * Слепой режим: единственная проверка видимости вина для гостя.
 * Пока бутылка не раскрыта, гость получает только «Вино №N».
 * ================================================================ */

export function isWineVisibleToGuest(mode: string, revealedAt: Date | null): boolean {
  return mode === TASTING_MODE.OPEN || revealedAt !== null;
}

/* ---------- Каталог ---------- */

export interface WineDTO {
  id: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  region: string | null;
  country: string | null;
  grape: string | null;
  color: WineColor | null;
  priceRub: number | null;
  isDemo: boolean;
}

export function toWineDTO(w: Wine): WineDTO {
  return {
    id: w.id,
    name: w.name,
    producer: w.producer,
    vintage: w.vintage,
    region: w.region,
    country: w.country,
    grape: w.grape,
    color: w.color as WineColor | null,
    priceRub: w.priceRub,
    isDemo: w.isDemo,
  };
}

/* ---------- Организатор (полные данные) ---------- */

export type OrgTastingSource = Tasting & {
  wines: (TastingWine & { wine: Wine; _count: { ratings: number } })[];
  _count: { guests: number; ratings: number };
};

export interface OrgTastingWineDTO {
  id: string;
  position: number;
  label: string;
  status: WineStatus;
  revealed: boolean;
  revealedAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
  ratingsCount: number;
  wine: WineDTO;
}

export interface OrgTastingDTO {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  mode: TastingMode;
  scale: ScaleId;
  notesEnabled: boolean;
  status: TastingStatus;
  inviteCode: string;
  adminKey: string;
  isDemo: boolean;
  startedAt: string | null;
  closedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  guestsCount: number;
  ratingsCount: number;
  wines: OrgTastingWineDTO[];
}

export function toOrgTastingDTO(t: OrgTastingSource): OrgTastingDTO {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    location: t.location,
    startsAt: iso(t.startsAt),
    mode: t.mode as TastingMode,
    scale: t.scale as ScaleId,
    notesEnabled: t.notesEnabled,
    status: t.status as TastingStatus,
    inviteCode: t.inviteCode,
    adminKey: t.adminKey,
    isDemo: t.isDemo,
    startedAt: iso(t.startedAt),
    closedAt: iso(t.closedAt),
    publishedAt: iso(t.publishedAt),
    createdAt: t.createdAt.toISOString(),
    guestsCount: t._count.guests,
    ratingsCount: t._count.ratings,
    wines: [...t.wines]
      .sort((a, b) => a.position - b.position)
      .map((tw) => ({
        id: tw.id,
        position: tw.position,
        label: blindWineLabel(tw.position),
        status: tw.status as WineStatus,
        revealed: tw.revealedAt !== null,
        revealedAt: iso(tw.revealedAt),
        openedAt: iso(tw.openedAt),
        closedAt: iso(tw.closedAt),
        ratingsCount: tw._count.ratings,
        wine: toWineDTO(tw.wine),
      })),
  };
}

/** Строка списка «Мои дегустации» (только дегустации владельца). */
export interface MyTastingDTO {
  adminKey: string;
  title: string;
  status: TastingStatus;
  isDemo: boolean;
}

export function toMyTastingDTO(t: Pick<Tasting, "adminKey" | "title" | "status" | "isDemo">): MyTastingDTO {
  return { adminKey: t.adminKey, title: t.title, status: t.status as TastingStatus, isDemo: t.isDemo };
}

/* ---------- Гость (blind-safe) ---------- */

/** Данные вина для гостя — только после раскрытия (или в открытом режиме). */
export interface GuestWineInfoDTO {
  name: string;
  producer: string | null;
  vintage: number | null;
  region: string | null;
  country: string | null;
  grape: string | null;
  color: WineColor | null;
  priceRub: number | null;
  isDemo: boolean;
}

export interface GuestTastingWineDTO {
  id: string;
  position: number;
  /** Всегда «Вино №N». */
  label: string;
  status: WineStatus;
  /** true — данные вина видны гостю (открытый режим или бутылка раскрыта). */
  revealed: boolean;
  wine: GuestWineInfoDTO | null;
}

export interface GuestRatingDTO {
  tastingWineId: string;
  value: number;
  note: string | null;
  createdAt: string;
}

export interface GuestTastingDTO {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  mode: TastingMode;
  scale: ScaleId;
  notesEnabled: boolean;
  status: TastingStatus;
  inviteCode: string;
  wines: GuestTastingWineDTO[];
  /** null — гость ещё не вошёл (нет cookie). */
  me: { displayName: string | null } | null;
  myRatings: GuestRatingDTO[];
}

/** Вино в программе для гостя: `wine` сервис подгружает только для видимых вин. */
export type GuestTastingWineSource = TastingWine & { wine?: Wine | null };

function toGuestWineInfo(w: Wine): GuestWineInfoDTO {
  return {
    name: w.name,
    producer: w.producer,
    vintage: w.vintage,
    region: w.region,
    country: w.country,
    grape: w.grape,
    color: w.color as WineColor | null,
    priceRub: w.priceRub,
    isDemo: w.isDemo,
  };
}

export function toGuestTastingWineDTO(mode: string, tw: GuestTastingWineSource): GuestTastingWineDTO {
  const revealed = isWineVisibleToGuest(mode, tw.revealedAt);
  return {
    id: tw.id,
    position: tw.position,
    label: blindWineLabel(tw.position),
    status: tw.status as WineStatus,
    revealed,
    // Двойная защита: даже если сервис по ошибке подгрузил вино, нераскрытое не отдаём.
    wine: revealed && tw.wine ? toGuestWineInfo(tw.wine) : null,
  };
}

export function toGuestRatingDTO(r: Rating): GuestRatingDTO {
  return {
    tastingWineId: r.tastingWineId,
    value: r.value,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  };
}

export function toGuestTastingDTO(
  tasting: Tasting,
  wines: GuestTastingWineSource[],
  guest: Guest | null,
  ratings: Rating[],
): GuestTastingDTO {
  return {
    title: tasting.title,
    description: tasting.description,
    location: tasting.location,
    startsAt: iso(tasting.startsAt),
    mode: tasting.mode as TastingMode,
    scale: tasting.scale as ScaleId,
    notesEnabled: tasting.notesEnabled,
    status: tasting.status as TastingStatus,
    inviteCode: tasting.inviteCode,
    wines: [...wines].sort((a, b) => a.position - b.position).map((tw) => toGuestTastingWineDTO(tasting.mode, tw)),
    me: guest ? { displayName: guest.displayName } : null,
    myRatings: guest ? ratings.filter((r) => r.guestId === guest.id).map(toGuestRatingDTO) : [],
  };
}

/* ---------- Сводка организатора ---------- */

export interface SummaryWineDTO {
  tastingWineId: string;
  position: number;
  label: string;
  status: WineStatus;
  revealed: boolean;
  wine: WineDTO;
  /** Место по avg100; null — нет оценок. */
  place: number | null;
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  avg100: number | null;
  /** Заметки гостей без имён. */
  notes: string[];
}

export interface SummaryDTO {
  scale: ScaleId;
  status: TastingStatus;
  guestsCount: number;
  totalRatings: number;
  wines: SummaryWineDTO[];
}

/* ---------- Публичные итоги дегустации ---------- */

export interface ResultRowDTO {
  place: number | null;
  tastingWineId: string;
  position: number;
  label: string;
  wine: GuestWineInfoDTO | null;
  count: number;
  avg: number | null;
  avg100: number | null;
  /** Оценка текущего гостя, если он есть. */
  myValue: number | null;
}

export interface PublicResultsDTO {
  title: string;
  mode: TastingMode;
  scale: ScaleId;
  publishedAt: string | null;
  guestsCount: number;
  rows: ResultRowDTO[];
}

/* ---------- Контракт передачи в «Народный винный рейтинг» ----------
 * Подробно — docs/rating-contract.md. Экспорт детерминирован (без generatedAt и статуса
 * дегустации), чтобы выгрузка до и после публикации давала тот же payload и тот же exportId. */

export interface RatingExportV1 {
  schemaVersion: "1.0";
  exportId: string;
  source: {
    system: "wine-tasting-constructor";
    tastingId: string;
    title: string;
    mode: TastingMode;
    closedAt: string;
    scale: { id: ScaleId; min: number; max: number; step: number };
  };
  wines: {
    tastingWineId: string;
    position: number;
    wineId: string;
    name: string;
    producer: string | null;
    vintage: number | null;
    region: string | null;
    country: string | null;
    grape: string | null;
    color: WineColor | null;
  }[];
  /** Только валидные оценки. Без имён и заметок — только анонимный guestHash. */
  ratings: {
    guestHash: string;
    tastingWineId: string;
    value: number;
    normalized100: number;
  }[];
  stats: {
    totalRatings: number;
    exportedRatings: number;
    rejected: { reason: string; count: number }[];
  };
}

export interface ImportResultDTO {
  exportId: string;
  accepted: number;
  rejected: number;
  reasons: { reason: string; count: number }[];
  /** true — этот exportId уже импортировался, возвращён сохранённый результат. */
  repeated: boolean;
}

export interface PublicRatingRowDTO {
  place: number;
  wineId: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  region: string | null;
  country: string | null;
  color: WineColor | null;
  isDemo: boolean;
  avg100: number;
  ratingsCount: number;
  tastingsCount: number;
}

/* ---------- Ошибки API ---------- */

export interface ApiErrorDTO {
  error: { code: string; message: string };
}
