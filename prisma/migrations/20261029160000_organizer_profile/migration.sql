-- Профиль организатора: имя для гостей, организация, город, описание, согласие на обработку данных.
-- Старые аккаунты получают имя из email (часть до «@»), чтобы гостям было что показать.

-- AlterTable
ALTER TABLE "Organizer" ADD COLUMN "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organizer" ADD COLUMN "organization" TEXT;
ALTER TABLE "Organizer" ADD COLUMN "city" TEXT;
ALTER TABLE "Organizer" ADD COLUMN "bio" TEXT;
ALTER TABLE "Organizer" ADD COLUMN "consentAt" DATETIME;

UPDATE "Organizer" SET "displayName" = substr("email", 1, instr("email", '@') - 1) WHERE "displayName" = '';
