import { handleRoute } from "@/lib/http";
import { IMAGE_CACHE_HEADERS } from "@/lib/image";
import * as wineService from "@/services/wineService";

type Ctx = { params: Promise<{ id: string }> };

/** Фото вина в каталоге. Каталог публичный (GET /api/wines); гость получает фото через /api/t/…/image. */
export async function GET(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { id } = await params;
    const { mime, data } = await wineService.getImage(id);
    return new Response(new Uint8Array(data), { headers: { "Content-Type": mime, ...IMAGE_CACHE_HEADERS } });
  });
}
