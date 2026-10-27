import { cx } from "./cx";

/** Пара «подпись — значение» внутри <dl>. */
export function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={cx("truncate", strong ? "font-serif text-lg text-primary" : "text-ink")}>{value}</dd>
    </div>
  );
}
