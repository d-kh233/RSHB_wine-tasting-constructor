import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildInvite } from "@/lib/qr";
import * as tastingService from "@/services/tastingService";

export const metadata: Metadata = {
  title: "QR для гостей",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Полноэкранный QR для проектора. */
export default async function QrPage({ params }: { params: Promise<{ adminKey: string }> }) {
  const { adminKey } = await params;
  const tasting = await tastingService.findOrgTasting(adminKey);
  if (!tasting) notFound();
  const invite = await buildInvite(tasting.inviteCode);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface px-4 py-8 text-center">
      <h1 className="max-w-3xl break-words text-display">{tasting.title}</h1>
      {invite.qrSvg ? (
        <div
          className="w-full max-w-[min(80vw,70vh)] [&>svg]:h-auto [&>svg]:w-full"
          role="img"
          aria-label={`QR-код со ссылкой ${invite.url}`}
          dangerouslySetInnerHTML={{ __html: invite.qrSvg }}
        />
      ) : (
        <p className="max-w-md text-ink-muted">QR не построен: не задан NEXT_PUBLIC_BASE_URL.</p>
      )}
      <div>
        <p className="text-lg text-ink-muted">Наведите камеру телефона или откройте</p>
        <p className="mt-1 break-all font-mono text-xl text-ink sm:text-2xl">{invite.url ?? invite.path}</p>
        <p className="mt-3 text-lg text-ink-muted">
          Код: <span className="font-serif text-3xl tracking-[0.2em] text-primary">{tasting.inviteCode}</span>
        </p>
      </div>
      <Link href={`/org/${adminKey}?tab=invite`} className="text-sm text-ink-muted underline-offset-4 hover:underline">
        ← Вернуться в кабинет
      </Link>
    </main>
  );
}
