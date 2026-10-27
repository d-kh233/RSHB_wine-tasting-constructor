import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export interface CardStyle {
  /** Приподнятая карточка — единственный случай, когда есть тень. */
  raised?: boolean;
  /** Рамка цвета бренда: открытое вино, первое место. */
  highlighted?: boolean;
  /** Поля 16px на всех ширинах — для карточек в списках. */
  compact?: boolean;
  /** Карточка-ссылка: реакция на hover и фокус. */
  interactive?: boolean;
}

/** Классы карточки — чтобы так же оформлять ссылки и элементы списков (<Link className={cardClass()}>). */
export function cardClass({ raised = false, highlighted = false, compact = false, interactive = false }: CardStyle = {}) {
  return cx(
    "min-w-0 max-w-full rounded-lg border bg-surface",
    compact ? "p-4" : "p-4 sm:p-6",
    highlighted ? "border-primary" : "border-line/70",
    raised && "shadow-raised",
    interactive &&
      "transition-[border-color,box-shadow] hover:border-primary/50 hover:shadow-raised focus-visible:border-primary",
  );
}

export function Card({
  raised,
  highlighted,
  compact,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & Omit<CardStyle, "interactive">) {
  return <div className={cx(cardClass({ raised, highlighted, compact }), className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cx("text-xl", className)} {...rest} />;
}
