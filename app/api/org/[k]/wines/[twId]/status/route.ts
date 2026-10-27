import { NextResponse } from "next/server";
import { handleRoute, readJson } from "@/lib/http";
import { wineActionSchema } from "@/lib/validation";
import * as tastingService from "@/services/tastingService";

type Ctx = { params: Promise<{ k: string; twId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k, twId } = await params;
    const { action } = wineActionSchema.parse(await readJson(req));
    return NextResponse.json(await tastingService.setWineStatus(k, twId, action));
  });
}
