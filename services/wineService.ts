// Каталог вин: поиск, добавление своего вина организатором и фото вина.

import { LIMITS } from "@/lib/constants";
import { db } from "@/lib/db";
import { toWineDTO, type WineDTO } from "@/lib/dto";
import { AppError, badRequest, notFound } from "@/lib/http";
import { IMAGE_MAX_BYTES, sniffImageMime, type ImageMime } from "@/lib/image";
import type { CreateWineInput } from "@/lib/validation";

/**
 * Поиск по названию, производителю, региону, стране и сорту.
 * SQLite LIKE регистронезависим только для латиницы, поэтому кириллицу фильтруем в JS —
 * для каталога в сотни-тысячи вин этого достаточно.
 */
export async function search(q: string): Promise<WineDTO[]> {
  const all = await db.wine.findMany({ orderBy: [{ isDemo: "desc" }, { name: "asc" }] });
  const needle = q.trim().toLocaleLowerCase("ru");
  const found = needle
    ? all.filter((w) =>
        [w.name, w.producer, w.region, w.country, w.grape].some((field) =>
          field?.toLocaleLowerCase("ru").includes(needle),
        ),
      )
    : all;
  return found.slice(0, LIMITS.CATALOG_SEARCH_LIMIT).map(toWineDTO);
}

export async function create(input: CreateWineInput): Promise<WineDTO> {
  return toWineDTO(await db.wine.create({ data: { ...input, isDemo: false } }));
}

/* ---------- Фото ----------
 * Одно фото на вино в каталоге: видно во всех дегустациях с этим вином. Права проверяет роут
 * (кабинет организатора), здесь — только размер и тип. */

async function requireWine(wineId: string) {
  const wine = await db.wine.findUnique({ where: { id: wineId }, select: { id: true } });
  if (!wine) throw notFound("Вино не найдено в каталоге");
  return wine;
}

export async function setImage(wineId: string, bytes: Uint8Array): Promise<WineDTO> {
  if (bytes.length === 0) throw badRequest("EMPTY_IMAGE", "Файл пустой");
  if (bytes.length > IMAGE_MAX_BYTES) {
    throw new AppError(413, "IMAGE_TOO_LARGE", `Картинка больше ${Math.round(IMAGE_MAX_BYTES / 1_000_000)} МБ`);
  }
  const mime = sniffImageMime(bytes);
  if (!mime) throw new AppError(415, "UNSUPPORTED_IMAGE", "Подойдут картинки JPEG, PNG или WebP");

  const wine = await requireWine(wineId);
  const data = new Uint8Array(bytes);
  const [, updated] = await db.$transaction([
    db.wineImage.upsert({ where: { wineId: wine.id }, create: { wineId: wine.id, mime, data }, update: { mime, data } }),
    db.wine.update({ where: { id: wine.id }, data: { imageUpdatedAt: new Date() } }),
  ]);
  return toWineDTO(updated);
}

export async function removeImage(wineId: string): Promise<WineDTO> {
  const wine = await requireWine(wineId);
  const [, updated] = await db.$transaction([
    db.wineImage.deleteMany({ where: { wineId: wine.id } }),
    db.wine.update({ where: { id: wine.id }, data: { imageUpdatedAt: null } }),
  ]);
  return toWineDTO(updated);
}

export async function getImage(wineId: string): Promise<{ mime: ImageMime; data: Uint8Array }> {
  const image = await db.wineImage.findUnique({ where: { wineId } });
  if (!image) throw notFound("Фото нет");
  return { mime: image.mime as ImageMime, data: image.data };
}
