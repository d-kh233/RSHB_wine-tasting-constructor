import Link from "next/link";
import { cx } from "./cx";

export const SITE_NAME = "DaVino";

/**
 * Логотип DaVino (public/logo.png): гроздь и надпись на белом фоне. mix-blend-multiply убирает белый фон
 * на кремовой странице. С `href` — ссылка (обычно на главную).
 */
export function Logo({ href, size = "md", className }: { href?: string; size?: "md" | "lg"; className?: string }) {
  const image = (
    // Обычный <img>: файл статичный и уже небольшой, оптимизатор next/image не нужен.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt={SITE_NAME}
      width={640}
      height={335}
      className={cx("w-auto max-w-full mix-blend-multiply", size === "lg" ? "h-28 sm:h-36" : "h-11 sm:h-12")}
    />
  );
  const classes = cx("inline-flex min-w-0 max-w-full items-center", className);

  return href ? (
    <Link href={href} className={cx(classes, "rounded-md")}>
      {image}
    </Link>
  ) : (
    <span className={classes}>{image}</span>
  );
}
