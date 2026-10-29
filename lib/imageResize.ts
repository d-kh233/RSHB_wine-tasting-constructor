// Сжатие фото на клиенте: длинная сторона до IMAGE_MAX_SIDE, JPEG. С телефона приходят снимки по 5–10 МБ —
// на сервер уходит ~100–200 КБ. Прозрачный фон PNG заливаем белым (в JPEG прозрачности нет).

import { IMAGE_JPEG_QUALITY, IMAGE_MAX_SIDE } from "./image";

export async function resizeImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Не удалось прочитать картинку. Подойдут JPEG, PNG или WebP");
  }
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Браузер не умеет сжимать картинки");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", IMAGE_JPEG_QUALITY));
  if (!blob) throw new Error("Не удалось сжать картинку");
  return blob;
}
