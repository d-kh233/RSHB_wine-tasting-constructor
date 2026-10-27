import { NextResponse } from "next/server";
import { handleRoute, readJson } from "@/lib/http";
import * as ratingService from "@/services/ratingService";

/** Импорт RatingExportV1: 201 — принят впервые, 200 — повтор exportId (тот же результат). */
export async function POST(req: Request) {
  return handleRoute(async () => {
    const { result, created } = await ratingService.importExport(await readJson(req));
    return NextResponse.json(result, { status: created ? 201 : 200 });
  });
}
