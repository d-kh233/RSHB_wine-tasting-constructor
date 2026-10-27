// Статистика оценок — одна функция для сводки организатора, итогов гостя и «Народного рейтинга»,
// чтобы числа на всех экранах совпадали (PLAN.md §9, «расхождения при пересчёте»).

import { normalize100, roundScore } from "./scales";

export interface WineStats {
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  avg100: number | null;
}

/** Оценки одного вина в шкале дегустации. avg100 — нормализация среднего (шкала линейная). */
export function wineStats(scaleId: string, values: number[]): WineStats {
  if (values.length === 0) return { count: 0, avg: null, min: null, max: null, avg100: null };
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return {
    count: values.length,
    avg: roundScore(avg),
    min: Math.min(...values),
    max: Math.max(...values),
    avg100: normalize100(scaleId, avg),
  };
}

/**
 * Места по убыванию балла: равный балл — равное место («1, 1, 3»).
 * Строки без балла (нет оценок) — в конце, место null. Порядок внутри равных сохраняется.
 */
export function rankByScore<T>(rows: T[], score: (row: T) => number | null): (T & { place: number | null })[] {
  const scored = rows.filter((r) => score(r) !== null).sort((a, b) => score(b)! - score(a)!);
  const ranked = scored.map((row) => ({ ...row, place: 0 }));
  for (let i = 0; i < ranked.length; i++) {
    ranked[i].place = i > 0 && score(scored[i]) === score(scored[i - 1]) ? ranked[i - 1].place : i + 1;
  }
  return [...ranked, ...rows.filter((r) => score(r) === null).map((row) => ({ ...row, place: null }))];
}

/** Map.groupBy есть только с Node 21, а проект поддерживает Node 20. */
export function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group) group.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}
