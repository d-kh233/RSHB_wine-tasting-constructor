import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestApp } from "@/components/guest/GuestApp";
import { readGuestToken } from "@/lib/auth";
import * as guestService from "@/services/guestService";

type Props = { params: Promise<{ inviteCode: string }> };

export const metadata: Metadata = {
  title: "Дегустация",
  robots: { index: false, follow: false },
};

/**
 * Анкета гостя. В client component уходит только GuestTastingDTO — в слепом режиме
 * данных нераскрытых вин нет ни в HTML, ни в RSC-payload (их даже не читают из БД).
 */
export default async function GuestPage({ params }: Props) {
  const { inviteCode } = await params;
  const view = await guestService.findGuestView(inviteCode, await readGuestToken(inviteCode));
  if (!view) notFound();
  return <GuestApp initial={view} />;
}
