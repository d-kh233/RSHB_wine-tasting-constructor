// Шкалы оценок — единственный источник диапазонов, шага и нормализации в 0..100.
// Используется в валидации, UI (ScaleInput), сводке, экспорте и импорте.

import { SCORE_DECIMALS } from "./constants";

export const SCALE_ID = {
  POINTS100: "points100",
  STARS5: "stars5",
  POINTS10: "points10",
} as const;
export type ScaleId = (typeof SCALE_ID)[keyof typeof SCALE_ID];
export const SCALE_IDS = Object.values(SCALE_ID) as ScaleId[];

/** Подсказка для ScaleInput, каким контролом рисовать шкалу. */
export type ScaleInputKind = "slider" | "stars" | "buttons";

export interface ScaleDef {
  id: ScaleId;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  input: ScaleInputKind;
}

export const SCALES: Record<ScaleId, ScaleDef> = {
  points100: {
    id: "points100",
    label: "100 баллов",
    hint: "От 0 до 100: 0 — ужасно, 100 — идеально",
    min: 0,
    max: 100,
    step: 1,
    input: "slider",
  },
  stars5: {
    id: "stars5",
    label: "5 звёзд",
    hint: "Просто и быстро: от 1 до 5 звёзд",
    min: 1,
    max: 5,
    step: 1,
    input: "stars",
  },
  points10: {
    id: "points10",
    label: "10 баллов",
    hint: "От 1 до 10 с шагом 0,5",
    min: 1,
    max: 10,
    step: 0.5,
    input: "buttons",
  },
};

const EPSILON = 1e-9;

export function isScaleId(value: string): value is ScaleId {
  return (SCALE_IDS as string[]).includes(value);
}

export function getScale(id: string): ScaleDef {
  if (!isScaleId(id)) throw new Error(`Unknown scale: ${id}`);
  return SCALES[id];
}

export function roundScore(value: number, decimals: number = SCORE_DECIMALS): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Значение в диапазоне шкалы и кратно её шагу. */
export function isValidValue(scaleId: string, value: number): boolean {
  if (!isScaleId(scaleId) || !Number.isFinite(value)) return false;
  const { min, max, step } = SCALES[scaleId];
  if (value < min - EPSILON || value > max + EPSILON) return false;
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < EPSILON;
}

/** Линейная нормализация в 0..100 по диапазону шкалы, округление — SCORE_DECIMALS. */
export function normalize100(scaleId: string, value: number): number {
  const { min, max } = getScale(scaleId);
  return roundScore(((value - min) / (max - min)) * 100);
}

/** То же в 1..5: normalized5 = 1 + 4 × normalized100 / 100 (для 5 звёзд совпадает с самой оценкой). */
export function normalize5(scaleId: string, value: number): number {
  const { min, max } = getScale(scaleId);
  return roundScore(1 + (4 * (value - min)) / (max - min));
}

/** Формулы для подсказок в UI и docs/rating-contract.md. */
export const NORMALIZATION_FORMULAS = [
  "normalized100 = (value − min) / (max − min) × 100",
  "normalized5 = 1 + 4 × (value − min) / (max − min)",
] as const;

/** Все допустимые значения шкалы (для кнопок / звёзд). */
export function scaleValues(scaleId: string): number[] {
  const { min, max, step } = getScale(scaleId);
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, i) => roundScore(min + i * step, 2));
}

export function formatScaleValue(scaleId: string, value: number): string {
  const scale = getScale(scaleId);
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
  return scale.input === "stars" ? `${text} ★` : `${text} / ${scale.max}`;
}

/** Балл 0..100 с одним знаком и запятой: 87,3. */
export const formatScore100 = (value: number) => roundScore(value).toFixed(1).replace(".", ",");
