import { NextResponse } from "next/server";
import { handleRoute, readJson } from "@/lib/http";
import { createWineSchema, wineSearchSchema } from "@/lib/validation";
import * as wineService from "@/services/wineService";

export async function GET(req: Request) {
  return handleRoute(async () => {
    const { q } = wineSearchSchema.parse({ q: new URL(req.url).searchParams.get("q") ?? undefined });
    return NextResponse.json(await wineService.search(q));
  });
}

export async function POST(req: Request) {
  return handleRoute(async () => {
    const input = createWineSchema.parse(await readJson(req));
    return NextResponse.json(await wineService.create(input), { status: 201 });
  });
}
