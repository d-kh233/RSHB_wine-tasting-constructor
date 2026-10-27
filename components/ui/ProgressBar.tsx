import { cx } from "./cx";

/** Полоска доли 0..1 (голоса, балл 0..100). */
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cx("h-2 overflow-hidden rounded-pill bg-surface-muted", className)}
    >
      <div className="h-full rounded-pill bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
