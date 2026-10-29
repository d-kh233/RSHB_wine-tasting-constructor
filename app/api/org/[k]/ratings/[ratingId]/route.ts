import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/http";
import * as tastingService from "@/services/tastingService";

type Ctx = { params: Promise<{ k: string; ratingId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k, ratingId } = await params;
    return NextResponse.json(await tastingService.deleteRating(k, ratingId));
  });
}
