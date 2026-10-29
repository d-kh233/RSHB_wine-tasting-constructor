import { NextResponse } from "next/server";
import { handleRoute, readJson } from "@/lib/http";
import { updateTastingSchema } from "@/lib/validation";
import * as tastingService from "@/services/tastingService";

type Ctx = { params: Promise<{ k: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k } = await params;
    return NextResponse.json(await tastingService.getOrgTasting(k));
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k } = await params;
    const input = updateTastingSchema.parse(await readJson(req));
    return NextResponse.json(await tastingService.update(k, input));
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k } = await params;
    await tastingService.remove(k);
    return new Response(null, { status: 204 });
  });
}
