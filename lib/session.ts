// Сессия организатора: подписанный токен в httpOnly-cookie, без таблицы сессий.
// Токен = `${organizerId}.${expiresAt}.${hmac}`; подпись — HMAC-SHA256 на SESSION_SECRET.
// Выход стирает cookie; отозвать уже выданный токен нельзя — он живёт до expiresAt.

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { isHttps } from "./auth";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "./constants";
import { db } from "./db";
import { AppError } from "./http";

const DEV_SECRET = "dev-only-session-secret";

/** В production секрет обязателен; без него вход не работает, а cookie считаются невалидными. */
function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;
  return process.env.NODE_ENV === "production" ? null : DEV_SECRET;
}

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

function createToken(organizerId: string): string {
  const secret = sessionSecret();
  if (!secret) throw new AppError(500, "SESSION_SECRET_MISSING", "На сервере не задан SESSION_SECRET — вход невозможен");
  const payload = `${organizerId}.${Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** id организатора из токена или null, если подпись не сходится или срок вышел. */
function verifyToken(token: string): string | null {
  const secret = sessionSecret();
  const [id, exp, sig] = token.split(".");
  if (!secret || !id || !exp || !sig) return null;
  const expected = Buffer.from(sign(`${id}.${exp}`, secret));
  const actual = Buffer.from(sig);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return Number(exp) * 1000 > Date.now() ? id : null;
}

/**
 * Secure — только в production и только по https: `npm start` по http в локальной сети
 * (http://<IP ноутбука>:3000) — тоже production, а Secure-cookie браузер там молча отбрасывает.
 */
const cookieOptions = (req: Request) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" && isHttps(req),
  path: "/",
  maxAge: SESSION_MAX_AGE_SEC,
});

export function setSessionCookie(res: NextResponse, req: Request, organizerId: string) {
  res.cookies.set(SESSION_COOKIE_NAME, createToken(organizerId), cookieOptions(req));
}

export function clearSessionCookie(res: NextResponse, req: Request) {
  res.cookies.set(SESSION_COOKIE_NAME, "", { ...cookieOptions(req), maxAge: 0 });
}

export interface SessionOrganizer {
  id: string;
  email: string;
  displayName: string;
}

/** Текущий организатор (server components и route handlers) или null. */
export async function getSessionOrganizer(): Promise<SessionOrganizer | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const id = token ? verifyToken(token) : null;
  if (!id) return null;
  // Аккаунт могли удалить из БД (на Render SQLite сбрасывается) — тогда токен уже ничего не значит.
  return db.organizer.findUnique({ where: { id }, select: { id: true, email: true, displayName: true } });
}
