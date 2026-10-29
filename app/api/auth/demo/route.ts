import { NextResponse } from "next/server";
import { showDemo } from "@/lib/demo";
import { handleRoute, notFound } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import * as organizerService from "@/services/organizerService";

/** Вход в публичный демо-аккаунт одной кнопкой; выключается только через NEXT_PUBLIC_SHOW_DEMO=false. */
export async function POST(req: Request) {
  return handleRoute(async () => {
    if (!showDemo()) throw notFound();
    const organizer = await organizerService.loginDemo();
    const res = NextResponse.json({ email: organizer.email });
    setSessionCookie(res, req, organizer.id);
    return res;
  });
}
