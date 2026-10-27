// Каталог вин: поиск и добавление своего вина организатором.

import { LIMITS } from "@/lib/constants";
import { db } from "@/lib/db";
import { toWineDTO, type WineDTO } from "@/lib/dto";
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
