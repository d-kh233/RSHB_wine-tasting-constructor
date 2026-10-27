// Идемпотентный seed: безопасно запускать при каждом старте (Render сбрасывает SQLite).
// - вина: upsert по seedKey (данные каталога приводятся к эталону);
// - демо-дегустация: создаётся один раз по inviteCode, её состояние не перезаписывается;
// - программа: добавляется, только если в демо-дегустации ещё нет вин.
//
// Демо-вина — реальные. Поля, в которых нет уверенности (год, цена, иногда сорт), — null.

import { PrismaClient, type Prisma } from "@prisma/client";
import { DEMO_ADMIN_KEY, DEMO_INVITE_CODE, TASTING_MODE, TASTING_STATUS, WINE_COLOR } from "../lib/constants";
import { SCALE_ID } from "../lib/scales";

const db = new PrismaClient();

type SeedWine = Omit<Prisma.WineCreateInput, "isDemo"> & { seedKey: string };

const DEMO_WINES: SeedWine[] = [
  {
    seedKey: "abrau-durso-brut",
    name: "Абрау-Дюрсо Брют",
    producer: "Абрау-Дюрсо",
    vintage: null,
    region: "Краснодарский край",
    country: "Россия",
    grape: null,
    color: WINE_COLOR.SPARKLING,
    priceRub: null,
  },
  {
    seedKey: "fanagoria-numbered-reserve-tsimlyansky",
    name: "Фанагория «Номерной резерв» Цимлянский чёрный",
    producer: "Фанагория",
    vintage: null,
    region: "Краснодарский край",
    country: "Россия",
    grape: "Цимлянский чёрный",
    color: WINE_COLOR.RED,
    priceRub: null,
  },
  {
    seedKey: "lefkadia-red",
    name: "Лефкадия красное",
    producer: "Лефкадия",
    vintage: null,
    region: "Краснодарский край",
    country: "Россия",
    grape: null,
    color: WINE_COLOR.RED,
    priceRub: null,
  },
  {
    seedKey: "cloudy-bay-sauvignon-blanc",
    name: "Cloudy Bay Sauvignon Blanc",
    producer: "Cloudy Bay",
    vintage: null,
    region: "Мальборо",
    country: "Новая Зеландия",
    grape: "Совиньон блан",
    color: WINE_COLOR.WHITE,
    priceRub: null,
  },
  {
    seedKey: "whispering-angel",
    name: "Whispering Angel",
    producer: "Château d'Esclans",
    vintage: null,
    region: "Кот де Прованс",
    country: "Франция",
    grape: null,
    color: WINE_COLOR.ROSE,
    priceRub: null,
  },
  {
    seedKey: "marques-de-riscal-reserva",
    name: "Marqués de Riscal Reserva",
    producer: "Marqués de Riscal",
    vintage: null,
    region: "Риоха",
    country: "Испания",
    grape: null,
    color: WINE_COLOR.RED,
    priceRub: null,
  },
];

async function main() {
  const wines = [];
  for (const { seedKey, ...data } of DEMO_WINES) {
    wines.push(
      await db.wine.upsert({
        where: { seedKey },
        create: { seedKey, ...data, isDemo: true },
        update: { ...data, isDemo: true },
      }),
    );
  }

  const tasting = await db.tasting.upsert({
    where: { inviteCode: DEMO_INVITE_CODE },
    create: {
      title: "Демо: слепая дегустация «Россия и мир»",
      description: "Шесть вин вслепую: российские хозяйства против известных зарубежных. Угадайте, где кто.",
      mode: TASTING_MODE.BLIND,
      scale: SCALE_ID.POINTS100,
      notesEnabled: true,
      status: TASTING_STATUS.DRAFT,
      inviteCode: DEMO_INVITE_CODE,
      adminKey: DEMO_ADMIN_KEY,
      isDemo: true,
    },
    update: {},
  });

  const programSize = await db.tastingWine.count({ where: { tastingId: tasting.id } });
  if (programSize === 0) {
    await db.tastingWine.createMany({
      data: wines.map((w, i) => ({ tastingId: tasting.id, wineId: w.id, position: i + 1 })),
    });
  }

  const [wineCount, tastingCount, programCount] = await Promise.all([
    db.wine.count({ where: { isDemo: true } }),
    db.tasting.count({ where: { isDemo: true } }),
    db.tastingWine.count({ where: { tastingId: tasting.id } }),
  ]);
  console.log(
    `[seed] демо-вин: ${wineCount}, демо-дегустаций: ${tastingCount}, вин в программе: ${programCount}` +
      (programSize === 0 ? " (программа создана)" : " (программа уже была)"),
  );
}

main()
  .catch((err) => {
    console.error("[seed] ошибка:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
