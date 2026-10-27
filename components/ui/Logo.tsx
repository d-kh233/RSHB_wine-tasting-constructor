import Link from "next/link";
import { cx } from "./cx";

/** Знак: бокал с вином и виноградный лист. Цвета — из токенов через currentColor. */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cx("shrink-0", className)}>
      <path
        d="M9.5 5h13c0 8-2.6 13-6.5 13S9.5 13 9.5 5Z"
        className="fill-surface stroke-primary"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10.3 10h11.4c-.6 4.8-2.6 7.2-5.7 7.2s-5.1-2.4-5.7-7.2Z" className="fill-primary" />
      <path d="M16 18v8M11.5 27h9" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      <path d="M22.5 6.5c1.2-3 4.2-4.3 7-3.6-.4 3-3.3 4.9-7 3.6Z" className="fill-leaf" />
      <path d="M22.5 6.5c1.6-1.2 3.3-2.1 5.2-2.6" className="stroke-surface" strokeWidth=".8" strokeLinecap="round" />
    </svg>
  );
}

/** Логотип сервиса; с `href` — ссылка (обычно на главную). */
export function Logo({
  href,
  withWordmark = true,
  size = "md",
  className,
}: {
  href?: string;
  withWordmark?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const content = (
    <>
      <LogoMark className={size === "lg" ? "h-12 w-12" : "h-8 w-8"} />
      {withWordmark && <span className="truncate font-serif text-base text-primary sm:text-lg">Конструктор дегустаций</span>}
    </>
  );
  const classes = cx("inline-flex min-w-0 max-w-full items-center gap-2", className);

  return href ? (
    <Link href={href} className={cx(classes, "rounded-md")} aria-label={withWordmark ? undefined : "Конструктор дегустаций"}>
      {content}
    </Link>
  ) : (
    <span className={classes} role={withWordmark ? undefined : "img"} aria-label={withWordmark ? undefined : "Конструктор дегустаций"}>
      {content}
    </span>
  );
}
