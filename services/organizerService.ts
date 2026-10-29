// Аккаунт организатора: регистрация, вход, профиль и его статистика. Сессию ставят роуты (lib/session.ts).

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS, DEMO_ORGANIZER_EMAIL, DEMO_ORGANIZER_PROFILE, TASTING_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { toProfileDTO, type ProfileDTO, type ProfileStatsDTO } from "@/lib/dto";
import { AppError, conflict, isUniqueViolation } from "@/lib/http";
import type { SessionOrganizer } from "@/lib/session";
import type { CredentialsInput, ProfileInput, RegisterInput } from "@/lib/validation";

const invalidCredentials = () => new AppError(401, "INVALID_CREDENTIALS", "Неверный email или пароль");
const emailTaken = () => conflict("EMAIL_TAKEN", "Этот email уже зарегистрирован — войдите");

const sessionSelect = { id: true, email: true, displayName: true } as const;

// Для несуществующего email всё равно считаем bcrypt: по времени ответа не понять, есть ли аккаунт.
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("dummy-password", BCRYPT_ROUNDS));

export async function register({ email, password, consent: _consent, ...profile }: RegisterInput): Promise<SessionOrganizer> {
  // Демо-аккаунт общий: иначе первый зарегистрировавший этот email получил бы вход «демо» в свой кабинет.
  if (email === DEMO_ORGANIZER_EMAIL) throw emailTaken();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    return await db.organizer.create({
      data: { email, passwordHash, ...profile, consentAt: new Date() },
      select: sessionSelect,
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw emailTaken();
    throw err;
  }
}

export async function login({ email, password }: CredentialsInput): Promise<SessionOrganizer> {
  const organizer = await db.organizer.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, organizer?.passwordHash ?? getDummyHash());
  if (!organizer || !ok) throw invalidCredentials();
  return { id: organizer.id, email: organizer.email, displayName: organizer.displayName };
}

/**
 * Вход в публичный демо-аккаунт без пароля. Аккаунт создаётся при первом входе (если seed не запускали);
 * пароль у него случайный и нигде не хранится — по паролю войти нельзя. Демо-дегустация закрепляется за ним.
 */
export async function loginDemo(): Promise<SessionOrganizer> {
  const organizer = await db.organizer.upsert({
    where: { email: DEMO_ORGANIZER_EMAIL },
    create: {
      email: DEMO_ORGANIZER_EMAIL,
      passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), BCRYPT_ROUNDS),
      ...DEMO_ORGANIZER_PROFILE,
    },
    update: { ...DEMO_ORGANIZER_PROFILE },
    select: sessionSelect,
  });
  await db.tasting.updateMany({ where: { isDemo: true, ownerId: null }, data: { ownerId: organizer.id } });
  return organizer;
}

export async function updateProfile(organizerId: string, input: ProfileInput): Promise<ProfileDTO> {
  const current = await db.organizer.findUnique({ where: { id: organizerId }, select: { email: true } });
  if (current?.email === DEMO_ORGANIZER_EMAIL) {
    throw conflict("DEMO_ACCOUNT", "Профиль демо-аккаунта менять нельзя — он общий");
  }
  const organizer = await db.organizer.update({ where: { id: organizerId }, data: input });
  return toProfileDTO(organizer);
}

/** Профиль и статистика: проведённые дегустации, собранные оценки, оценки, переданные в «Народный рейтинг». */
export async function getProfile(organizerId: string): Promise<{ profile: ProfileDTO; stats: ProfileStatsDTO } | null> {
  const organizer = await db.organizer.findUnique({ where: { id: organizerId } });
  if (!organizer) return null;

  const tastings = await db.tasting.findMany({ where: { ownerId: organizerId }, select: { id: true, status: true } });
  const ids = tastings.map((t) => t.id);
  const [ratings, guests, sentToRating] = await Promise.all([
    db.rating.count({ where: { tastingId: { in: ids } } }),
    db.guest.count({ where: { tastingId: { in: ids } } }),
    // PublicRating не связан с дегустацией внешним ключом — только её id; удалённые дегустации в счёт не идут.
    db.publicRating.count({ where: { sourceTastingId: { in: ids } } }),
  ]);

  return {
    profile: toProfileDTO(organizer),
    stats: {
      tastingsTotal: tastings.length,
      tastingsConducted: tastings.filter(
        (t) => t.status === TASTING_STATUS.CLOSED || t.status === TASTING_STATUS.PUBLISHED,
      ).length,
      guests,
      ratings,
      sentToRating,
    },
  };
}
