import { NextResponse } from "next/server";
import { AppError, handleRoute } from "@/lib/http";
import { IMAGE_MAX_BYTES } from "@/lib/image";
import * as tastingService from "@/services/tastingService";
import * as wineService from "@/services/wineService";

type Ctx = { params: Promise<{ k: string; wineId: string }> };

/** Фото вина в каталоге — из кабинета организатора. Тело — байты картинки (клиент уже сжал её). */
export async function PUT(req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k, wineId } = await params;
    await tastingService.requireCatalogEditor(k);
    // Отсекаем заведомо большой файл до чтения тела.
    if (Number(req.headers.get("content-length") ?? 0) > IMAGE_MAX_BYTES) {
      throw new AppError(413, "IMAGE_TOO_LARGE", "Картинка слишком большая");
    }
    const bytes = new Uint8Array(await req.arrayBuffer());
    return NextResponse.json(await wineService.setImage(wineId, bytes));
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { k, wineId } = await params;
    await tastingService.requireCatalogEditor(k);
    return NextResponse.json(await wineService.removeImage(wineId));
  });
}
