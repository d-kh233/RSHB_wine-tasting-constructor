import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/http";
import * as tastingService from "@/services/tastingService";

type Ctx = { params: Promise<{ k: string; twId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k, twId } = await params;
    return NextResponse.json(await tastingService.reveal(k, twId));
  });
}
