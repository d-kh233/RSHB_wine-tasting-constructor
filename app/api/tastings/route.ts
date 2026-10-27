import { NextResponse } from "next/server";
import { handleRoute, readJson } from "@/lib/http";
import { createTastingSchema } from "@/lib/validation";
import * as tastingService from "@/services/tastingService";

export async function POST(req: Request) {
  return handleRoute(async () => {
    const input = createTastingSchema.parse(await readJson(req));
    return NextResponse.json(await tastingService.create(input), { status: 201 });
  });
}
