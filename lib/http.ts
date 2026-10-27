// Единый формат ошибок API: { error: { code, message } } (PLAN.md §6).
// Сервисы бросают AppError, роуты оборачиваются в handleRoute().

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiErrorDTO } from "./dto";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (code: string, message: string) => new AppError(400, code, message);
export const unauthorized = (message = "Сначала войдите в дегустацию") => new AppError(401, "UNAUTHORIZED", message);
export const notFound = (message = "Не найдено") => new AppError(404, "NOT_FOUND", message);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
export const unprocessable = (code: string, message: string) => new AppError(422, code, message);

/** Нарушение UNIQUE в Prisma (P2002) — гонка, которую не поймала проверка в сервисе. */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json<ApiErrorDTO>({ error: { code, message } }, { status });
}

function toErrorResponse(err: unknown) {
  if (err instanceof AppError) return errorResponse(err.status, err.code, err.message);
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue?.path.join(".");
    return errorResponse(400, "VALIDATION", issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Некорректные данные");
  }
  console.error("[api] необработанная ошибка:", err);
  return errorResponse(500, "INTERNAL", "Что-то пошло не так. Попробуйте ещё раз");
}

/** Тело запроса как JSON; битый JSON → 400. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest("INVALID_JSON", "Тело запроса должно быть JSON");
  }
}

/** Обёртка роута: всё, что бросили сервисы и zod, превращается в единый формат ошибки. */
export async function handleRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    return toErrorResponse(err);
  }
}
