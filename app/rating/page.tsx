import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { cardClass } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/EmptyState";
import { Logo } from "@/components/ui/Logo";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { wineDetails } from "@/components/ui/WineCard";
import { MIN_RATINGS_FOR_RATING, WINE_COLOR_LABEL } from "@/lib/constants";
import { plural } from "@/lib/plural";
import { formatScore100 } from "@/lib/scales";
import * as ratingService from "@/services/ratingService";

export const metadata: Metadata = { title: "Народный винный рейтинг" };

// Рейтинг меняется при каждом импорте — страницу не пререндерим при сборке.
export const dynamic = "force-dynamic";

export default async function RatingPage() {
  const rows = await ratingService.listPublic();

  return (
    <Container as="main" className="pb-16">
      <div className="py-4">
        <Logo href="/" />
      </div>
      <header className="max-w-2xl pt-4">
        <h1 className="text-display">Народный винный рейтинг</h1>
        <p className="mt-3 text-ink-muted">
          Средняя оценка гостей дегустаций по шкале 0–100. Оценки анонимные и приходят только из завершённых
          дегустаций; каждая шкала (5 звёзд, 10 или 100 баллов) приводится к 0–100. Место получает вино, у которого
          не меньше {plural(MIN_RATINGS_FOR_RATING, ["оценки", "оценок", "оценок"])}.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="Пока нет импортированных оценок"
          text="Организатор передаёт оценки в рейтинг на вкладке «Итоги» после завершения дегустации."
          className="mt-8"
        />
      ) : (
        <ol className="mt-8 space-y-2">
          {rows.map((row) => {
            const details = wineDetails({ ...row, grape: null });
            return (
              <li
                key={row.wineId}
                className={cx(
                  cardClass({ compact: true }),
                  "flex items-start gap-4 sm:items-center",
                  row.place === null && "opacity-80",
                )}
              >
                {row.place !== null ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-serif text-lg text-primary">
                    {row.place}
                  </div>
                ) : (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted"
                    aria-label="Без места"
                  >
                    —
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-ink">{row.name}</p>
                  {details && <p className="mt-0.5 break-words text-sm text-ink-muted">{details}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {row.color && <Badge>{WINE_COLOR_LABEL[row.color]}</Badge>}
                    {row.isDemo && <Badge tone="accent">демо</Badge>}
                    {row.place === null && <Badge tone="warning">Мало оценок</Badge>}
                  </div>
                  <ProgressBar value={row.avg100 / 100} label={`Средний балл: ${formatScore100(row.avg100)}`} className="mt-3 sm:hidden" />
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-serif text-2xl text-primary">{formatScore100(row.avg100)}</p>
                  <p className="text-xs text-ink-muted">{plural(row.ratingsCount, ["оценка", "оценки", "оценок"])}</p>
                  <p className="text-xs text-ink-muted">
                    {plural(row.tastingsCount, ["дегустация", "дегустации", "дегустаций"])}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Container>
  );
}
