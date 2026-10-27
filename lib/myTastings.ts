// «Мои дегустации» — список кабинетов, открытых в этом браузере.
// Авторизации организатора пока нет (adminKey — у каждой дегустации свой), поэтому список
// живёт в localStorage: только для удобства, источник правды — ссылка /org/[adminKey].

import type { TastingStatus } from "./constants";

export interface MyTastingEntry {
  adminKey: string;
  title: string;
  status: TastingStatus;
  isDemo: boolean;
  /** Когда кабинет открывали последний раз (ISO). */
  seenAt: string;
}

const STORAGE_KEY = "wt_my_tastings";
const MAX_ENTRIES = 30;

export function readMyTastings(): MyTastingEntry[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as MyTastingEntry[]).filter((e) => e && typeof e.adminKey === "string") : [];
  } catch {
    return [];
  }
}

function write(entries: MyTastingEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* приватный режим / хранилище недоступно — список просто не сохранится */
  }
}

/** Добавляет или обновляет запись и поднимает её наверх. */
export function rememberTasting(entry: Omit<MyTastingEntry, "seenAt">) {
  const rest = readMyTastings().filter((e) => e.adminKey !== entry.adminKey);
  write([{ ...entry, seenAt: new Date().toISOString() }, ...rest]);
}

export function forgetTasting(adminKey: string) {
  write(readMyTastings().filter((e) => e.adminKey !== adminKey));
}
