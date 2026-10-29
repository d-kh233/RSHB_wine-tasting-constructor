-- Фото вин в программе дегустации. Только добавления: существующие вина остаются без фото (шаблон).

-- AlterTable
ALTER TABLE "TastingWine" ADD COLUMN "imageUpdatedAt" DATETIME;

-- CreateTable
CREATE TABLE "TastingWineImage" (
    "tastingWineId" TEXT NOT NULL PRIMARY KEY,
    "mime" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TastingWineImage_tastingWineId_fkey" FOREIGN KEY ("tastingWineId") REFERENCES "TastingWine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
