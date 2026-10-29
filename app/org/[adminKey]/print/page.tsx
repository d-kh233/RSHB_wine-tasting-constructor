import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrganizerLine } from "@/components/guest/OrganizerLine";
import { PrintButton } from "@/components/org/PrintButton";
import { LocalDate } from "@/components/ui/LocalDate";
import { buildInvite } from "@/lib/qr";
import * as tastingService from "@/services/tastingService";

export const metadata: Metadata = {
  title: "Листок с QR для печати",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Лист A4 без полей браузера; фон страницы при печати белый.
const PRINT_CSS = "@page { size: A4; margin: 12mm } @media print { html, body { background: #fff !important } }";

/** Листок A4 для стола: название, организатор, QR и код крупно. */
export default async function PrintPage({ params }: { params: Promise<{ adminKey: string }> }) {
  const { adminKey } = await params;
  const info = await tastingService.findPrintInfo(adminKey);
  if (!info) notFound();
  const invite = await buildInvite(info.inviteCode);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[210mm] flex-col items-center gap-6 bg-surface px-6 py-8 text-center print:min-h-0 print:max-w-none print:gap-8 print:p-0">
      <style>{PRINT_CSS}</style>

      <div className="flex w-full flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/org/${adminKey}?tab=live`} className="text-sm font-medium text-ink-muted underline-offset-4 hover:underline">
          ← Вернуться в кабинет
        </Link>
        <PrintButton />
      </div>

      <div className="flex flex-col items-center gap-2">
        <h1 className="max-w-3xl break-words text-display print:text-5xl">{info.title}</h1>
        {(info.startsAt || info.location) && (
          <p className="text-lg text-ink-muted">
            {info.startsAt && <LocalDate iso={info.startsAt} />}
            {info.startsAt && info.location && " · "}
            {info.location}
          </p>
        )}
        <OrganizerLine organizer={info.organizer} className="text-lg" />
      </div>

      {invite.qrSvg ? (
        <div
          className="w-full max-w-[140mm] [&>svg]:h-auto [&>svg]:w-full"
          role="img"
          aria-label={`QR-код со ссылкой ${invite.url}`}
          dangerouslySetInnerHTML={{ __html: invite.qrSvg }}
        />
      ) : (
        <p className="max-w-md text-ink-muted">QR не построен: не задан NEXT_PUBLIC_BASE_URL.</p>
      )}

      <div>
        <p className="text-xl text-ink-muted">Наведите камеру телефона на QR-код или введите код на сайте</p>
        <p className="mt-1 break-all font-mono text-lg text-ink">{invite.url ?? invite.path}</p>
        <p className="mt-4 text-xl text-ink-muted">Код дегустации</p>
        <p className="font-serif text-7xl tracking-[0.25em] text-primary">{info.inviteCode}</p>
      </div>

      <p className="text-base text-ink-muted">Регистрация не нужна. Оценки анонимны, имя можно не вводить.</p>
    </main>
  );
}
