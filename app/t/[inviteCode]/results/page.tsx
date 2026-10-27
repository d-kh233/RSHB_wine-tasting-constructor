import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultsView } from "@/components/guest/ResultsView";
import { buttonClass } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { normalizeInviteCode, readGuestToken } from "@/lib/auth";
import { AppError } from "@/lib/http";
import * as guestService from "@/services/guestService";

type Props = { params: Promise<{ inviteCode: string }> };

export const metadata: Metadata = {
  title: "Итоги дегустации",
  robots: { index: false, follow: false },
};

/** Итоги — только после публикации. Данные вин берутся тем же blind-safe путём, что и анкета. */
export default async function ResultsPage({ params }: Props) {
  const { inviteCode } = await params;
  const code = normalizeInviteCode(inviteCode);
  try {
    const results = await guestService.getResults(code, await readGuestToken(code));
    return <ResultsView results={results} inviteCode={code} />;
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    if (err instanceof AppError && err.code === "NOT_PUBLISHED") {
      return (
        <Container as="main" size="narrow" className="py-16">
          <EmptyState
            icon="⏳"
            title="Итоги ещё не опубликованы"
            text="Организатор опубликует их после дегустации. Анкета сама покажет ссылку, когда итоги будут готовы."
            action={
              <Link href={`/t/${code}`} className={buttonClass()}>
                К дегустации
              </Link>
            }
          />
        </Container>
      );
    }
    throw err;
  }
}
