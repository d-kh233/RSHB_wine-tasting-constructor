import { NextResponse } from "next/server";
import { readGuestToken } from "@/lib/auth";
import { handleRoute, readJson } from "@/lib/http";
import { rateSchema } from "@/lib/validation";
import * as guestService from "@/services/guestService";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { code } = await params;
    const input = rateSchema.parse(await readJson(req));
    const rating = await guestService.rate(code, await readGuestToken(code), input);
    return NextResponse.json({ rating }, { status: 201 });
  });
}
