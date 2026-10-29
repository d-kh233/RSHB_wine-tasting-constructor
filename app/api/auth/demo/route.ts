import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import * as organizerService from "@/services/organizerService";

/** Вход в публичный демо-аккаунт одной кнопкой — чтобы посмотреть кабинет без регистрации. */
export async function POST(req: Request) {
  return handleRoute(async () => {
    const organizer = await organizerService.loginDemo();
    const res = NextResponse.json({ email: organizer.email });
    setSessionCookie(res, req, organizer.id);
    return res;
  });
}
