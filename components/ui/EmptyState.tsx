import type { ReactNode } from "react";
import { cx } from "./cx";

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center rounded-lg border border-dashed border-line px-4 py-8 text-center", className)}>
      {icon && (
        <div className="mb-2 text-3xl" aria-hidden>
          {icon}
        </div>
      )}
      <p className="font-medium text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
