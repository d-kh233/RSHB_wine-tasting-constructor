import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

/** Подпись + контрол + подсказка/ошибка. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

// 16px шрифт в полях — iOS не зумит страницу при фокусе.
const control =
  "w-full min-w-0 max-w-full rounded-md border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-muted/70 " +
  "transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(control, "min-h-24 py-2.5 leading-snug", className)} {...rest} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(control, "h-11 pr-8", className)} {...rest} />;
}
