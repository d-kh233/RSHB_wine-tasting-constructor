-- Фото переезжают из программы дегустации в каталог: одно фото на вино, видно во всех дегустациях.
-- Уже загруженные фото переносятся к своему вину (если у вина их несколько — берётся самое свежее).

-- AlterTable
ALTER TABLE "Wine" ADD COLUMN "imageUpdatedAt" DATETIME;

-- CreateTable
CREATE TABLE "WineImage" (
    "wineId" TEXT NOT NULL PRIMARY KEY,
    "mime" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WineImage_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Перенос данных
INSERT INTO "WineImage" ("wineId", "mime", "data", "updatedAt")
SELECT tw."wineId", ti."mime", ti."data", ti."updatedAt"
FROM "TastingWineImage" ti
JOIN "TastingWine" tw ON tw."id" = ti."tastingWineId"
WHERE ti."updatedAt" = (
    SELECT MAX(ti2."updatedAt")
    FROM "TastingWineImage" ti2
    JOIN "TastingWine" tw2 ON tw2."id" = ti2."tastingWineId"
    WHERE tw2."wineId" = tw."wineId"
)
GROUP BY tw."wineId";

UPDATE "Wine" SET "imageUpdatedAt" = (SELECT wi."updatedAt" FROM "WineImage" wi WHERE wi."wineId" = "Wine"."id")
WHERE "id" IN (SELECT "wineId" FROM "WineImage");

-- Фото уровня дегустации больше не нужны
DROP TABLE "TastingWineImage";
ALTER TABLE "TastingWine" DROP COLUMN "imageUpdatedAt";
