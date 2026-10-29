-- Е1: опция «минимум гостей» и журнал отброшенных оценок.
-- Только добавления: существующие строки получают minGuests = 0, таблица Tasting не пересоздаётся.

-- AlterTable
ALTER TABLE "Tasting" ADD COLUMN "minGuests" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RejectedRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tastingId" TEXT NOT NULL,
    "guestId" TEXT,
    "tastingWineId" TEXT NOT NULL,
    "value" REAL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RejectedRating_tastingId_fkey" FOREIGN KEY ("tastingId") REFERENCES "Tasting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RejectedRating_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RejectedRating_tastingId_idx" ON "RejectedRating"("tastingId");
