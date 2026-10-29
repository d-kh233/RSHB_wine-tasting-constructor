import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ProfileForm } from "@/components/org/ProfileForm";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { DEMO_ORGANIZER_EMAIL } from "@/lib/constants";
import { getSessionOrganizer } from "@/lib/session";
import * as organizerService from "@/services/organizerService";

export const metadata: Metadata = { title: "Профиль организатора", robots: { index: false, follow: false } };

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

function StatTile({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-md bg-surface-muted p-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-1 font-serif text-3xl text-primary">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-ink-muted">{hint}</dd>}
    </div>
  );
}

/** Профиль организатора: публичные данные для гостей и статистика проведённых дегустаций. */
export default async function ProfilePage() {
  const organizer = await getSessionOrganizer();
  if (!organizer) redirect("/login?next=/profile");
  const data = await organizerService.getProfile(organizer.id);
  if (!data) redirect("/login?next=/profile");
  const { profile, stats } = data;

  return (
    <Container as="main" className="pb-16">
      <div className="py-4">
        <Logo href="/" />
      </div>
      <div className="mx-auto max-w-2xl space-y-6 pt-4">
        <div>
          <Link href="/" className="text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
            ← На главную
          </Link>
          <h1 className="mt-4 text-title">{profile.displayName || "Профиль организатора"}</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-muted">
            <span className="min-w-0 break-all">{organizer.email}</span>
            <LogoutButton />
          </p>
        </div>

        <section aria-labelledby="stats">
          <h2 id="stats" className="text-xl">
            Статистика
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              value={stats.tastingsConducted}
              label="Проведено дегустаций"
              hint={stats.tastingsTotal > stats.tastingsConducted ? `всего создано: ${stats.tastingsTotal}` : undefined}
            />
            <StatTile value={stats.guests} label="Гостей" />
            <StatTile value={stats.ratings} label="Собрано оценок" />
            <StatTile value={stats.sentToRating} label="Передано в рейтинг" />
          </dl>
          <p className="mt-2 text-xs text-ink-muted">
            Проведённые — завершённые и опубликованные. В рейтинг попадают только валидные анонимные оценки.
          </p>
        </section>

        <Card raised className="space-y-4">
          <h2 className="text-xl">Данные для гостей</h2>
          <p className="text-sm text-ink-muted">
            Гости увидят их на входе в дегустацию и в итогах. Email и пароль не показываются.{" "}
            <Link href="/privacy" className={linkClass}>
              Политика конфиденциальности
            </Link>
          </p>
          <ProfileForm initial={profile} locked={organizer.email === DEMO_ORGANIZER_EMAIL} />
        </Card>
      </div>
    </Container>
  );
}
