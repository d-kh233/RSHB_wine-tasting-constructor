import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/http";
import * as ratingService from "@/services/ratingService";

export async function GET() {
  return handleRoute(async () =>
    NextResponse.json(await ratingService.listPublic(), { headers: { "Cache-Control": "no-store" } }),
  );
}
