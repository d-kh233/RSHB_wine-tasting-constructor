// Счётчики попыток (неудачные входы, запросы гостя) в памяти процесса: хватает для одного инстанса (Render, ноутбук).
// При нескольких инстансах или рестарте счётчики не общие — тогда нужен Redis или таблица в БД.

import { tooManyRequests } from "./http";

interface Window {
  failures: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

function current(key: string): Window | null {
  const w = windows.get(key);
  if (w && w.resetAt <= Date.now()) {
    windows.delete(key);
    return null;
  }
  return w ?? null;
}

/** Сколько секунд ждать, если лимит исчерпан; 0 — можно пробовать. */
export function retryAfterSec(key: string, maxFailures: number): number {
  const w = current(key);
  return w && w.failures >= maxFailures ? Math.ceil((w.resetAt - Date.now()) / 1000) : 0;
}

const MAX_KEYS = 10_000;

export function recordFailure(key: string, windowMs: number) {
  // Перебор с разных адресов не должен раздувать память: чистим истёкшие окна.
  if (windows.size > MAX_KEYS) for (const k of windows.keys()) current(k);
  const w = current(key);
  if (w) w.failures++;
  else windows.set(key, { failures: 1, resetAt: Date.now() + windowMs });
}

/** Счётчик запросов: учитывает этот запрос и возвращает, сколько секунд ждать (0 — запрос в пределах лимита). */
export function hitLimit(key: string, limit: { max: number; windowMs: number }): number {
  const wait = retryAfterSec(key, limit.max);
  if (wait === 0) recordFailure(key, limit.windowMs);
  return wait;
}

/** Лимит запросов (вход гостя, оценка): сверх лимита — 429 с подсказкой, сколько ждать. */
export function enforceLimit(key: string, limit: { max: number; windowMs: number }) {
  const wait = hitLimit(key, limit);
  if (wait > 0) throw tooManyRequests(`Слишком много запросов. Подождите ${wait} с и попробуйте снова`);
}

export function resetFailures(key: string) {
  windows.delete(key);
}

/** IP клиента: за прокси хостинга — первый адрес из x-forwarded-for. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
