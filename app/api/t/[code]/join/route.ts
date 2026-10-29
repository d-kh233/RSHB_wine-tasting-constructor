import { NextResponse } from "next/server";
import { guestCookieOptions, normalizeInviteCode, readGuestToken } from "@/lib/auth";
import { GUEST_JOIN_LIMIT, guestCookieName } from "@/lib/constants";
import { handleRoute, readJson } from "@/lib/http";
import { clientIp, enforceLimit } from "@/lib/rateLimit";
import { joinSchema } from "@/lib/validation";
import * as guestService from "@/services/guestService";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { code } = await params;
    enforceLimit(`join:${clientIp(req)}:${normalizeInviteCode(code)}`, GUEST_JOIN_LIMIT);
    const { displayName } = joinSchema.parse(await readJson(req));
    const { guestId, newToken } = await guestService.join(code, displayName, await readGuestToken(code));

    const res = NextResponse.json({ guestId }, { status: newToken ? 201 : 200 });
    if (newToken) res.cookies.set(guestCookieName(normalizeInviteCode(code)), newToken, guestCookieOptions(req));
    return res;
  });
}
