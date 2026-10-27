import Link from "next/link";
import type { ReactNode } from "react";
import { HeroIllustration } from "@/components/home/HeroIllustration";
import { GuestCard, OrganizerCard } from "@/components/home/RoleCards";
import { MyTastingsList } from "@/components/org/MyTastings";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { DEMO_ADMIN_KEY, DEMO_INVITE_CODE } from "@/lib/constants";

const BENEFITS: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "Слепая и открытая дегустация",
    text: "В слепой гости видят только «Вино №N», пока вы не раскроете бутылку.",
    icon: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        <path d="M4 4l16 16" />
      </>
    ),
  },
  {
    title: "Вход гостей по QR без регистрации",
    text: "Гость наводит камеру и сразу оценивает с телефона.",
    icon: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5z" />,
  },
  {
    title: "Честные оценки — в рейтинг",
    text: "Один голос за вино от гостя; итоги уходят в Народный винный рейтинг.",
    icon: (
      <>
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
        <path d="M8.5 12l2.5 2.5 4.5-5" />
      </>
    ),
  },
];

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

export default function HomePage() {
  return (
    <Container as="main" className="py-8 sm:py-12 lg:py-16">
      {/* Телефон: промо → выбор роли → иллюстрация. Десктоп: промо и иллюстрация слева, выбор роли справа. */}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <section className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Logo withWordmark={false} size="lg" />
          <h1 className="mt-6 text-display">Конструктор дегустаций</h1>
          <p className="mt-4 max-w-xl text-ink-muted">
            Открытая или слепая дегустация за пять минут: вина из каталога, понятная шкала, гости оценивают с телефона,
            вы видите итоги.
          </p>
          <ul className="mt-8 space-y-4">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-4">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-primary ring-1 ring-line/70">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    {b.icon}
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-ink">{b.title}</p>
                  <p className="text-sm text-ink-muted">{b.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="min-w-0 space-y-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="space-y-4">
            <OrganizerCard />
            <GuestCard />
          </div>

          <MyTastingsList />

          <section aria-labelledby="demo">
            <h2 id="demo" className="text-xl">
              Демо
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <Link href={`/org/${DEMO_ADMIN_KEY}`} className={linkClass}>
                  Кабинет организатора →
                </Link>
              </li>
              <li>
                <Link href={`/t/${DEMO_INVITE_CODE}`} className={linkClass}>
                  Анкета гостя (код {DEMO_INVITE_CODE}) →
                </Link>
              </li>
              <li>
                <Link href="/rating" className={linkClass}>
                  Народный винный рейтинг →
                </Link>
              </li>
            </ul>
          </section>
        </div>

        <HeroIllustration className="mx-auto max-w-md lg:col-start-1 lg:row-start-2 lg:mx-0" />
      </div>
    </Container>
  );
}
