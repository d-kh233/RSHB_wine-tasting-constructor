import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/http";
import * as exportService from "@/services/exportService";

type Ctx = { params: Promise<{ k: string }> };

/** RatingExportV1; `?download=1` — отдать файлом. */
export async function GET(req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k } = await params;
    const payload = await exportService.build(k);
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (new URL(req.url).searchParams.get("download") === "1") {
      headers["Content-Disposition"] = `attachment; filename="${payload.exportId}.json"`;
    }
    return NextResponse.json(payload, { headers });
  });
}
