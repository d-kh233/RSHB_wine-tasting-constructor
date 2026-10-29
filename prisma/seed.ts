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

const DEMO_TITLE = "Демо: слепая дегустация «Тристория и гости»";
const DEMO_DESCRIPTION =
  "Вина вслепую: от резервной линейки Тристории до ледяного вина Purcari. Угадайте, где какое вино.";

type SeedWine = Omit<Prisma.WineCreateInput, "isDemo"> & { seedKey: string };

const DEMO_WINES: SeedWine[] = [
  {
    seedKey: "tristoria-reserve-white-chardonnay",
    name: "Резерв. Белое. Шардоне",
    producer: "Тристория",
    vintage: null,
    region: null,
    country: "Россия",
    grape: "Шардоне",
    color: WINE_COLOR.WHITE,
    priceRub: null,
  },
  {
    seedKey: "tristoria-reserve-red-2021",
    name: "Резерв. Красное. 2021",
    producer: "Тристория",
    vintage: 2021,
    region: null,
    country: "Россия",
    grape: null,
    color: WINE_COLOR.RED,
    priceRub: null,
  },
  {
    seedKey: "tristoria-reserve-red-2022",
    name: "Резерв. Красное. 2022",
    producer: "Тристория",
    vintage: 2022,
    region: null,
    country: "Россия",
    grape: null,
    color: WINE_COLOR.RED,
    priceRub: null,
  },
  {
    seedKey: "tristoria-appellation-rose",
    name: "Аппеласьон. Сира, Пино Нуар. Розовое",
    producer: "Тристория",
    vintage: null,
    region: null,
    country: "Россия",
    grape: "Сира, Пино нуар",
    color: WINE_COLOR.ROSE,
    priceRub: null,
  },
  {
    seedKey: "tristoria-appellation-cabernet-syrah",
    name: "Аппеласьон. Каберне Совиньон Сира. Красное",
    producer: "Тристория",
    vintage: null,
    region: null,
    country: "Россия",
    grape: "Каберне Совиньон, Сира",
    color: WINE_COLOR.RED,
    priceRub: null,
  },
  {
    seedKey: "tristoria-orange-art",
    name: "Оранж. Арт",
    producer: "Тристория",
    vintage: null,
    region: null,
    country: "Россия",
    grape: null,
    color: WINE_COLOR.ORANGE,
    priceRub: null,
  },
  {
    seedKey: "tristoria-o-mein-gott-art",
    name: "O, MEIN GOTT! АРТ",
    producer: "Тристория",
    vintage: null,
    region: null,
    country: "Россия",
    grape: null,
    color: null,
    priceRub: null,
  },
  {
    seedKey: "dolina-chernomorskaya-dolina",
    name: "Черноморская долина",
    producer: "Долина",
    vintage: null,
    region: null,
    country: null,
    grape: null,
    color: null,
    priceRub: null,
  },
  {
    seedKey: "purcari-ice-wine",
    name: "Purcari Ice Wine",
    producer: "Purcari",
    vintage: null,
    region: null,
    country: "Молдова",
    grape: null,
    color: null,
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
      title: DEMO_TITLE,
      description: DEMO_DESCRIPTION,
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
