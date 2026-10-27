import { NextResponse } from "next/server";
import { readGuestToken } from "@/lib/auth";
import { handleRoute } from "@/lib/http";
import * as guestService from "@/services/guestService";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { code } = await params;
    const results = await guestService.getResults(code, await readGuestToken(code));
    return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
  });
}
