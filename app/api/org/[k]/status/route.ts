import { NextResponse } from "next/server";
import { handleRoute, readJson } from "@/lib/http";
import { tastingActionSchema } from "@/lib/validation";
import * as tastingService from "@/services/tastingService";

type Ctx = { params: Promise<{ k: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k } = await params;
    const { action } = tastingActionSchema.parse(await readJson(req));
    return NextResponse.json(await tastingService.setStatus(k, action));
  });
}
