import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { MyTastingsList } from "@/components/org/MyTastings";
import { Alert } from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { DEMO_ACCOUNT_LIMITS, DEMO_ORGANIZER_EMAIL } from "@/lib/constants";
import { getSessionOrganizer } from "@/lib/session";
import * as tastingService from "@/services/tastingService";

export const metadata: Metadata = { title: "Кабинет организатора", robots: { index: false, follow: false } };

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

/** Кабинет организатора: список его дегустаций и создание новой. Только для вошедшего. */
export default async function CabinetPage() {
  const organizer = await getSessionOrganizer();
  if (!organizer) redirect("/login?next=/cabinet");
  const entries = await tastingService.listByOwner(organizer.id);

  return (
    <Container as="main" className="pb-16">
      <div className="py-4">
        <Logo href="/" />
      </div>
      <div className="mx-auto max-w-2xl space-y-6 pt-4">
        <div>
          <h1 className="text-title">Мои дегустации</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-muted">
            <span className="min-w-0 break-all">{organizer.displayName || organizer.email}</span>
            <Link href="/profile" className={linkClass}>
              Профиль
            </Link>
            <LogoutButton />
          </p>
        </div>
        {organizer.email === DEMO_ORGANIZER_EMAIL && (
          <Alert tone="info">
            Демо-аккаунт общий: не больше {DEMO_ACCOUNT_LIMITS.MAX_TASTINGS} дегустаций, а созданные больше суток назад
            удаляются автоматически.
          </Alert>
        )}
        <Link href="/cabinet/new" className={buttonClass({ size: "lg", block: true })}>
          Создать дегустацию
        </Link>
        <MyTastingsList entries={entries} />
      </div>
    </Container>
  );
}
