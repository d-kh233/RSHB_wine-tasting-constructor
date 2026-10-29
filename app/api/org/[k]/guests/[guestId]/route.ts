import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/http";
import * as tastingService from "@/services/tastingService";

type Ctx = { params: Promise<{ k: string; guestId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k, guestId } = await params;
    return NextResponse.json(await tastingService.deleteGuest(k, guestId));
  });
}
