import { NextResponse } from "next/server";
import { readGuestToken } from "@/lib/auth";
import { handleRoute } from "@/lib/http";
import * as guestService from "@/services/guestService";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { code } = await params;
    const view = await guestService.getGuestView(code, await readGuestToken(code));
    return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
  });
}
