import { NextResponse } from "next/server";
import { LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS } from "@/lib/constants";
import { AppError, handleRoute, readJson, tooManyRequests } from "@/lib/http";
import { clientIp, recordFailure, resetFailures, retryAfterSec } from "@/lib/rateLimit";
import { setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import * as organizerService from "@/services/organizerService";

export async function POST(req: Request) {
  return handleRoute(async () => {
    const input = loginSchema.parse(await readJson(req));
    const key = `login:${clientIp(req)}:${input.email}`;

    const wait = retryAfterSec(key, LOGIN_MAX_FAILURES);
    if (wait > 0) throw tooManyRequests(`Слишком много неудачных попыток. Попробуйте через ${Math.ceil(wait / 60)} мин.`);

    try {
      const organizer = await organizerService.login(input);
      resetFailures(key);
      const res = NextResponse.json({ email: organizer.email });
      setSessionCookie(res, req, organizer.id);
      return res;
    } catch (err) {
      if (err instanceof AppError && err.code === "INVALID_CREDENTIALS") recordFailure(key, LOGIN_WINDOW_MS);
      throw err;
    }
  });
}
