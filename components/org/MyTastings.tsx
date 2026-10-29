"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TASTING_STATUS_LABEL } from "@/lib/constants";
import type { MyTastingDTO } from "@/lib/dto";
import { LogoutButton } from "../auth/LogoutButton";
import { Badge, type BadgeTone } from "../ui/Badge";
import { cx } from "../ui/cx";
import { DeleteTastingButton } from "./DeleteTastingButton";

export const STATUS_TONE: Record<MyTastingDTO["status"], BadgeTone> = {
  draft: "neutral",
  running: "success",
  closed: "warning",
  published: "info",
};

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

/** Список дегустаций на главной: дегустации аккаунта; без входа — приглашение войти. */
export function MyTastingsList({
  organizer,
  entries,
}: {
  organizer: { email: string; displayName: string } | null;
  entries: MyTastingDTO[];
}) {
  const router = useRouter();
  return (
    <section aria-labelledby="my-tastings">
      <h2 id="my-tastings" className="text-xl">
        Мои дегустации
      </h2>
      {organizer === null ? (
        <p className="mt-1 text-sm text-ink-muted">
          <Link href="/login" className={linkClass}>
            Войдите
          </Link>{" "}
          или{" "}
          <Link href="/register" className={linkClass}>
            зарегистрируйтесь
          </Link>
          , чтобы ваши дегустации хранились в аккаунте. Без аккаунта в кабинет можно попасть только по секретной ссылке.
        </p>
      ) : (
        <>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-muted">
            <span className="min-w-0 break-all">{organizer.displayName || organizer.email}</span>
            <Link href="/profile" className={linkClass}>
              Профиль
            </Link>
            <LogoutButton />
          </p>
          {entries.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              Пока пусто.{" "}
              <Link href="/new" className={linkClass}>
                Создайте первую дегустацию →
              </Link>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {entries.map((e) => (
                <li key={e.adminKey} className="flex items-center gap-2 pr-3 hover:bg-surface-muted">
                  <Link href={`/org/${e.adminKey}`} className="block min-w-0 flex-1 px-4 py-3">
                    <span className="block truncate font-medium text-ink">{e.title}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone={STATUS_TONE[e.status]}>{TASTING_STATUS_LABEL[e.status]}</Badge>
                      {e.isDemo && <Badge tone="accent">демо</Badge>}
                    </span>
                  </Link>
                  {!e.isDemo && (
                    <DeleteTastingButton
                      adminKey={e.adminKey}
                      title={e.title}
                      size="sm"
                      variant="ghost"
                      label="Удалить"
                      onDeleted={() => router.refresh()}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Переключатель в шапке кабинета. entries — дегустации аккаунта; null — организатор не вошёл,
 * тогда вместо списка ссылка на вход (в этот кабинет он попал по секретной ссылке).
 */
export function TastingSwitcher({ current, entries }: { current: MyTastingDTO; entries: MyTastingDTO[] | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (entries === null) {
    return (
      <Link
        href="/login"
        className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-md px-2 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        Войти
      </Link>
    );
  }

  // Текущая — всегда первой и с живыми названием и статусом из кабинета.
  const others = entries.filter((e) => e.adminKey !== current.adminKey);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        Мои дегустации
        {others.length > 0 && <span className="text-xs">({others.length + 1})</span>}
        <span aria-hidden className={cx("transition-transform", open && "rotate-180")}>
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-line bg-surface shadow-raised">
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {[current, ...others].map((e) => (
              <li key={e.adminKey}>
                <Link
                  href={`/org/${e.adminKey}`}
                  onClick={() => setOpen(false)}
                  aria-current={e.adminKey === current.adminKey ? "page" : undefined}
                  className={cx(
                    "block px-3 py-2.5 hover:bg-surface-muted",
                    e.adminKey === current.adminKey && "bg-primary-soft",
                  )}
                >
                  <span className="block truncate text-sm font-medium text-ink">{e.title}</span>
                  <span className="text-xs text-ink-muted">
                    {TASTING_STATUS_LABEL[e.status]}
                    {e.isDemo && " · демо"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-line px-3 py-2.5 text-sm">
            <Link href="/new" className="font-medium text-primary underline-offset-4 hover:underline">
              + Новая дегустация
            </Link>
            <span className="flex gap-3">
              <Link href="/profile" className="font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                Профиль
              </Link>
              <LogoutButton />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
