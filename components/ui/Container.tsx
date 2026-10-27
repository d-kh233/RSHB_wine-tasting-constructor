import type { HTMLAttributes } from "react";
import { cx } from "./cx";

const SIZE = {
  /** Основная ширина страниц. */
  page: "max-w-6xl",
  /** Анкета гостя и короткие экраны: одна колонка под телефон. */
  narrow: "max-w-form",
};

/** Единый контейнер страницы: ширина и горизонтальные поля 16 / 24 / 32px. */
export function Container({
  as: Tag = "div",
  size = "page",
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "div" | "main" | "header" | "section"; size?: keyof typeof SIZE }) {
  return <Tag className={cx("mx-auto w-full px-4 sm:px-6 lg:px-8", SIZE[size], className)} {...rest} />;
}
