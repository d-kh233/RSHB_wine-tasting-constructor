// Ключи, коды и cookie гостя. Авторизация организатора — в планах: сейчас доступ = знание adminKey.

import { createHash, randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import {
  ADMIN_KEY_BYTES,
  GUEST_COOKIE_MAX_AGE_SEC,
  GUEST_TOKEN_BYTES,
  guestCookieName,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
} from "./constants";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const generateAdminKey = () => randomBytes(ADMIN_KEY_BYTES).toString("base64url");

export const generateGuestToken = () => randomBytes(GUEST_TOKEN_BYTES).toString("base64url");

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  return code;
}

/** Код из URL: регистр не важен, гость может набрать его руками. */
export const normalizeInviteCode = (code: string) => code.trim().toUpperCase();

/** Запрос пришёл по https — напрямую или через прокси хостинга (Render ставит x-forwarded-proto). */
function isHttps(req: Request): boolean {
  const forwarded = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  return (forwarded ?? new URL(req.url).protocol.replace(":", "")) === "https";
}

/**
 * httpOnly; Secure — только когда сайт открыт по https. Не по NODE_ENV: `npm start` по http в локальной сети
 * (http://<IP ноутбука>:3000) — тоже production, и Secure-cookie браузер там молча отбрасывает.
 */
export const guestCookieOptions = (req: Request) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isHttps(req),
  path: "/",
  maxAge: GUEST_COOKIE_MAX_AGE_SEC,
});

/** Токен гостя из cookie (server components и route handlers). */
export async function readGuestToken(inviteCode: string): Promise<string | null> {
  const store = await cookies();
  return store.get(guestCookieName(normalizeInviteCode(inviteCode)))?.value ?? null;
}
