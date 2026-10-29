-- CreateTable
CREATE TABLE "Organizer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Tasting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" DATETIME,
    "mode" TEXT NOT NULL,
    "scale" TEXT NOT NULL,
    "notesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "inviteCode" TEXT NOT NULL,
    "adminKey" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "startedAt" DATETIME,
    "closedAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tasting_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Organizer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seedKey" TEXT,
    "name" TEXT NOT NULL,
    "producer" TEXT,
    "vintage" INTEGER,
    "region" TEXT,
    "country" TEXT,
    "grape" TEXT,
    "color" TEXT,
    "priceRub" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TastingWine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tastingId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "revealedAt" DATETIME,
    "openedAt" DATETIME,
    "closedAt" DATETIME,
    CONSTRAINT "TastingWine_tastingId_fkey" FOREIGN KEY ("tastingId") REFERENCES "Tasting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TastingWine_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tastingId" TEXT NOT NULL,
    "displayName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Guest_tastingId_fkey" FOREIGN KEY ("tastingId") REFERENCES "Tasting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tastingId" TEXT NOT NULL,
    "tastingWineId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "scale" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rating_tastingId_fkey" FOREIGN KEY ("tastingId") REFERENCES "Tasting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rating_tastingWineId_fkey" FOREIGN KEY ("tastingWineId") REFERENCES "TastingWine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rating_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RatingImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exportId" TEXT NOT NULL,
    "sourceTastingId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "acceptedCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "resultJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PublicRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "sourceTastingId" TEXT NOT NULL,
    "guestHash" TEXT NOT NULL,
    "normalized100" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicRating_importId_fkey" FOREIGN KEY ("importId") REFERENCES "RatingImport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublicRating_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_email_key" ON "Organizer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tasting_inviteCode_key" ON "Tasting"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "Tasting_adminKey_key" ON "Tasting"("adminKey");

-- CreateIndex
CREATE INDEX "Tasting_ownerId_idx" ON "Tasting"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Wine_seedKey_key" ON "Wine"("seedKey");

-- CreateIndex
CREATE INDEX "Wine_name_idx" ON "Wine"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TastingWine_tastingId_wineId_key" ON "TastingWine"("tastingId", "wineId");

-- CreateIndex
CREATE UNIQUE INDEX "TastingWine_tastingId_position_key" ON "TastingWine"("tastingId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_tokenHash_key" ON "Guest"("tokenHash");

-- CreateIndex
CREATE INDEX "Guest_tastingId_idx" ON "Guest"("tastingId");

-- CreateIndex
CREATE INDEX "Rating_tastingId_idx" ON "Rating"("tastingId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_guestId_tastingWineId_key" ON "Rating"("guestId", "tastingWineId");

-- CreateIndex
CREATE UNIQUE INDEX "RatingImport_exportId_key" ON "RatingImport"("exportId");

-- CreateIndex
CREATE INDEX "PublicRating_wineId_idx" ON "PublicRating"("wineId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicRating_sourceTastingId_guestHash_wineId_key" ON "PublicRating"("sourceTastingId", "guestHash", "wineId");

