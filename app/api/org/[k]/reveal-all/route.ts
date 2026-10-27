import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/http";
import * as tastingService from "@/services/tastingService";

type Ctx = { params: Promise<{ k: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k } = await params;
    return NextResponse.json(await tastingService.revealAll(k));
  });
}
