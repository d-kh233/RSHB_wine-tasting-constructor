import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res, req);
  return res;
}
