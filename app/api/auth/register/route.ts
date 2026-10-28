import { NextResponse } from "next/server";
import { handleRoute, readJson } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import { registerSchema } from "@/lib/validation";
import * as organizerService from "@/services/organizerService";

export async function POST(req: Request) {
  return handleRoute(async () => {
    const organizer = await organizerService.register(registerSchema.parse(await readJson(req)));
    const res = NextResponse.json({ email: organizer.email }, { status: 201 });
    setSessionCookie(res, req, organizer.id);
    return res;
  });
}
