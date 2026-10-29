import type { ReactNode } from "react";
import { WINE_COLOR_LABEL, type WineColor } from "@/lib/constants";
import { cardClass } from "./Card";
import { cx } from "./cx";

/** Общие поля WineDTO и GuestWineInfoDTO — карточка подходит и организатору, и гостю. */
export interface WineInfo {
  name: string;
  producer: string | null;
  vintage: number | null;
  region: string | null;
  country: string | null;
  grape: string | null;
  color: WineColor | null;
}

export function wineDetails(wine: WineInfo): string {
  const place = [wine.region, wine.country].filter(Boolean).join(", ");
  return [wine.producer, wine.vintage, place, wine.grape].filter(Boolean).join(" · ");
}

/**
 * Вино в программе или каталоге. `wine = null` — слепой режим: показываем только «Вино №N».
 * `position` не задан — карточка каталога (без номера).
 */
export function WineCard({
  position,
  label,
  wine,
  badges,
  actions,
  children,
  highlighted = false,
  className,
}: {
  position?: number;
  label?: string;
  wine: WineInfo | null;
  badges?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  highlighted?: boolean;
  className?: string;
}) {
  const details = wine ? wineDetails(wine) : "";
  return (
    <div className={cx(cardClass({ compact: true, highlighted, raised: highlighted }), className)}>
      <div className="flex items-start gap-3">
        {position !== undefined && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-serif text-lg text-primary">
            {position}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {wine ? (
            <>
              {label && <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>}
              <p className="break-words font-medium text-ink">{wine.name}</p>
              {details && <p className="mt-0.5 break-words text-sm text-ink-muted">{details}</p>}
            </>
          ) : (
            <>
              <p className="font-medium text-ink">{label}</p>
              <p className="text-sm text-ink-muted">Название откроют после закрытия голосования</p>
            </>
          )}
          {(badges || wine?.color) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {wine?.color && <span className="rounded-pill bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">{WINE_COLOR_LABEL[wine.color]}</span>}
              {badges}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
