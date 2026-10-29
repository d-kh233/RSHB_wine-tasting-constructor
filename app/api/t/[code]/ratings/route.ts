import { NextResponse } from "next/server";
import { normalizeInviteCode, readGuestToken } from "@/lib/auth";
import { GUEST_RATE_LIMIT } from "@/lib/constants";
import { handleRoute, readJson } from "@/lib/http";
import { clientIp, enforceLimit } from "@/lib/rateLimit";
import { rateSchema } from "@/lib/validation";
import * as guestService from "@/services/guestService";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { code } = await params;
    enforceLimit(`rate:${clientIp(req)}:${normalizeInviteCode(code)}`, GUEST_RATE_LIMIT);
    const input = rateSchema.parse(await readJson(req));
    const rating = await guestService.rate(code, await readGuestToken(code), input);
    return NextResponse.json({ rating }, { status: 201 });
  });
}
