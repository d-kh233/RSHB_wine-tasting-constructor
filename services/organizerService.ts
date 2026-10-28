// Аккаунт организатора: регистрация и проверка пароля. Сессию ставят роуты (lib/session.ts).

import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "@/lib/constants";
import { db } from "@/lib/db";
import { AppError, conflict, isUniqueViolation } from "@/lib/http";
import type { SessionOrganizer } from "@/lib/session";
import type { CredentialsInput } from "@/lib/validation";

const invalidCredentials = () => new AppError(401, "INVALID_CREDENTIALS", "Неверный email или пароль");

// Для несуществующего email всё равно считаем bcrypt: по времени ответа не понять, есть ли аккаунт.
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("dummy-password", BCRYPT_ROUNDS));

export async function register({ email, password }: CredentialsInput): Promise<SessionOrganizer> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    return await db.organizer.create({ data: { email, passwordHash }, select: { id: true, email: true } });
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict("EMAIL_TAKEN", "Этот email уже зарегистрирован — войдите");
    throw err;
  }
}

export async function login({ email, password }: CredentialsInput): Promise<SessionOrganizer> {
  const organizer = await db.organizer.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, organizer?.passwordHash ?? getDummyHash());
  if (!organizer || !ok) throw invalidCredentials();
  return { id: organizer.id, email: organizer.email };
}
