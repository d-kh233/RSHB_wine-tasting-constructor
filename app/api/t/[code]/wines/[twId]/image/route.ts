import { handleRoute } from "@/lib/http";
import { IMAGE_CACHE_HEADERS } from "@/lib/image";
import * as guestService from "@/services/guestService";

type Ctx = { params: Promise<{ code: string; twId: string }> };

/** Фото вина для гостя; в слепом режиме нераскрытое — 404 (как и данные вина). */
export async function GET(_req: Request, { params }: Ctx) {
  return handleRoute(async () => {
    const { code, twId } = await params;
    const { mime, data } = await guestService.getImage(code, twId);
    return new Response(new Uint8Array(data), { headers: { "Content-Type": mime, ...IMAGE_CACHE_HEADERS } });
  });
}
