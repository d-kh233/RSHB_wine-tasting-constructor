// Фото вин: тип по сигнатуре файла (Content-Type от клиента не доверяем) и лимиты.
// Клиент сжимает картинку до IMAGE_MAX_SIDE перед отправкой (lib/imageResize.ts), сервер проверяет размер и тип.

export const IMAGE_MAX_BYTES = 1_000_000;
/** Длинная сторона после сжатия на клиенте, px. */
export const IMAGE_MAX_SIDE = 800;
export const IMAGE_JPEG_QUALITY = 0.82;

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

/** null — не JPEG, PNG или WebP. */
export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

/** Байты картинки уже содержат версию в URL (?v=), поэтому их можно кэшировать навсегда. */
export const IMAGE_CACHE_HEADERS = { "Cache-Control": "private, max-age=31536000, immutable" } as const;
