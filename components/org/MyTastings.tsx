"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TASTING_STATUS_LABEL } from "@/lib/constants";
import { forgetTasting, readMyTastings, rememberTasting, type MyTastingEntry } from "@/lib/myTastings";
import { Badge, type BadgeTone } from "../ui/Badge";
import { cx } from "../ui/cx";

export const STATUS_TONE: Record<MyTastingEntry["status"], BadgeTone> = {
  draft: "neutral",
  running: "success",
  closed: "warning",
  published: "info",
};

function useMyTastings() {
  const [entries, setEntries] = useState<MyTastingEntry[] | null>(null);
  useEffect(() => setEntries(readMyTastings()), []);
  return [entries, setEntries] as const;
}

/** Список дегустаций на главной: все кабинеты, открытые в этом браузере. */
export function MyTastingsList() {
  const [entries, setEntries] = useMyTastings();
  if (!entries || entries.length === 0) return null;

  return (
    <section aria-labelledby="my-tastings">
      <h2 id="my-tastings" className="text-xl">
        Мои дегустации
      </h2>
      <p className="mt-1 text-sm text-ink-muted">Сохранены в этом браузере. Авторизация организатора — в планах.</p>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {entries.map((e) => (
          <li key={e.adminKey} className="flex items-center gap-2 pr-2">
            <Link href={`/org/${e.adminKey}`} className="min-w-0 flex-1 px-4 py-3 hover:bg-surface-muted">
              <span className="block truncate font-medium text-ink">{e.title}</span>
              <span className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone={STATUS_TONE[e.status]}>{TASTING_STATUS_LABEL[e.status]}</Badge>
                {e.isDemo && <Badge tone="accent">демо</Badge>}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                forgetTasting(e.adminKey);
                setEntries(readMyTastings());
              }}
              aria-label={`Убрать «${e.title}» из списка`}
              title="Убрать из списка (дегустация не удаляется)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg text-ink-muted hover:bg-surface-muted"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Переключатель в шапке кабинета: запоминает текущую дегустацию и показывает остальные. */
export function TastingSwitcher({ current }: { current: Omit<MyTastingEntry, "seenAt"> }) {
  const [entries, setEntries] = useMyTastings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Название и статус в списке всегда актуальны для открытой дегустации.
  useEffect(() => {
    rememberTasting(current);
    setEntries(readMyTastings());
  }, [current.adminKey, current.title, current.status, current.isDemo]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const others = (entries ?? []).filter((e) => e.adminKey !== current.adminKey);

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
          <Link
            href="/#create"
            className="block border-t border-line px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary-soft"
          >
            + Новая дегустация
          </Link>
        </div>
      )}
    </div>
  );
}
