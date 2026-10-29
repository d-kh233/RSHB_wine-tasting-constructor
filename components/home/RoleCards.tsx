import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "../auth/LogoutButton";
import { CodeEntry } from "../guest/CodeEntry";
import { buttonClass } from "../ui/Button";
import { cardClass } from "../ui/Card";
import { cx } from "../ui/cx";

function RoleIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary-soft">
      <svg viewBox="0 0 32 32" className="h-8 w-8 fill-none stroke-primary" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

/**
 * Карточка «Я организатор». Дегустации создаются только в кабинете, поэтому без входа — «Войти» и
 * «Зарегистрироваться», со входом — «Перейти в кабинет». demo — кнопка демо-входа (если демо не отключено через NEXT_PUBLIC_SHOW_DEMO=false).
 */
export function OrganizerCard({
  organizer,
  demo,
}: {
  organizer: { displayName: string; email: string } | null;
  demo?: ReactNode;
}) {
  return (
    <section aria-labelledby="org-entry" className={cx(cardClass({ raised: true }), "flex min-h-40 flex-col gap-4")}>
      <div className="flex gap-4">
        <RoleIcon>
          <rect x="7" y="5" width="18" height="23" rx="3" className="fill-surface" />
          <rect x="12" y="3" width="8" height="5" rx="1.5" className="fill-primary" />
          <path d="M11.5 13h.01M14.5 13h7M11.5 18.5h.01M14.5 18.5h7M11.5 24h.01M14.5 24h5" />
        </RoleIcon>
        <div className="min-w-0">
          <h2 id="org-entry" className="text-xl">
            Я организатор
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Соберите программу из каталога, выберите шкалу и покажите гостям QR.
          </p>
        </div>
      </div>
      {organizer ? (
        <div className="mt-auto space-y-3">
          <p className="min-w-0 break-words text-sm text-ink-muted">
            Вы вошли как <span className="font-medium text-ink">{organizer.displayName || organizer.email}</span>
          </p>
          <Link href="/cabinet" className={buttonClass({ size: "lg", block: true })}>
            Перейти в кабинет
          </Link>
          <p className="flex gap-4 text-sm">
            <Link href="/profile" className="font-medium text-primary underline-offset-4 hover:underline">
              Профиль
            </Link>
            <LogoutButton />
          </p>
        </div>
      ) : (
        <div className="mt-auto space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/login" className={buttonClass({ size: "lg", block: true })}>
              Войти
            </Link>
            <Link href="/register" className={buttonClass({ variant: "secondary", size: "lg", block: true })}>
              Зарегистрироваться
            </Link>
          </div>
          {demo}
        </div>
      )}
    </section>
  );
}

/** Карточка «Я гость»: вход по коду, если QR не под рукой. */
export function GuestCard() {
  return (
    <section
      aria-labelledby="guest-entry"
      className={cx(
        cardClass({ raised: true }),
        "flex min-h-40 flex-col gap-4 transition-[border-color] hover:border-primary/50 focus-within:border-primary",
      )}
    >
      <div className="flex gap-4">
        <RoleIcon>
          <rect x="9" y="3" width="14" height="26" rx="3" className="fill-surface" />
          <path d="M12 7h3.5v3.5H12zM16.5 7H20v3.5h-3.5zM12 11.5h3.5V15H12zM16.5 11.5h1.5V13h-1.5zM18.5 13.5H20V15h-1.5z" className="fill-primary" strokeWidth="1" />
          <path d="M14 25h4" />
        </RoleIcon>
        <div className="min-w-0">
          <h2 id="guest-entry" className="text-xl">
            Я гость
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Отсканируйте QR у организатора камерой телефона или введите код дегустации.
          </p>
        </div>
      </div>
      <CodeEntry className="mt-auto" />
    </section>
  );
}
