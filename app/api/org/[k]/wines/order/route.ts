import { NextResponse } from "next/server";
import { handleRoute, readJson } from "@/lib/http";
import { reorderSchema } from "@/lib/validation";
import * as tastingService from "@/services/tastingService";

type Ctx = { params: Promise<{ k: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k } = await params;
    const { orderedIds } = reorderSchema.parse(await readJson(req));
    return NextResponse.json(await tastingService.reorder(k, orderedIds));
  });
}
