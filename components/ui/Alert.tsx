import type { ReactNode } from "react";
import { cx } from "./cx";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONE: Record<AlertTone, string> = {
  info: "border-info/30 bg-info-soft text-info",
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

export function Alert({ tone = "info", children, className }: { tone?: AlertTone; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx("rounded-md border px-3 py-2.5 text-sm", TONE[tone], className)}
    >
      {children}
    </div>
  );
}
