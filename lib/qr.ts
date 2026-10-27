// Ссылка-приглашение и QR строятся ТОЛЬКО из NEXT_PUBLIC_BASE_URL — никакого localhost в QR.

import QRCode from "qrcode";

export interface InviteInfo {
  /** Абсолютная ссылка для гостей; null — NEXT_PUBLIC_BASE_URL не задан. */
  url: string | null;
  path: string;
  /** SVG-разметка QR (генерируется на сервере); null, если ссылки нет. */
  qrSvg: string | null;
}

export function getBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

export const invitePath = (inviteCode: string) => `/t/${inviteCode}`;

export function buildInviteUrl(inviteCode: string): string | null {
  const base = getBaseUrl();
  return base ? `${base}${invitePath(inviteCode)}` : null;
}

export async function toQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
}

export async function buildInvite(inviteCode: string): Promise<InviteInfo> {
  const url = buildInviteUrl(inviteCode);
  return { url, path: invitePath(inviteCode), qrSvg: url ? await toQrSvg(url) : null };
}
