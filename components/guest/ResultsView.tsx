import Link from "next/link";
import type { PublicResultsDTO } from "@/lib/dto";
import { plural } from "@/lib/plural";
import { formatScaleValue, formatScore100, SCALES } from "@/lib/scales";
import { Badge } from "../ui/Badge";
import { Container } from "../ui/Container";
import { cx } from "../ui/cx";
import { EmptyState } from "../ui/EmptyState";
import { LocalDate } from "../ui/LocalDate";
import { ProgressBar } from "../ui/ProgressBar";
import { Stat } from "../ui/Stat";
import { WineCard } from "../ui/WineCard";
import { OrganizerLine } from "./OrganizerLine";

/** Публичные итоги дегустации: места, средние и — если гость голосовал — его оценки рядом. */
export function ResultsView({ results, inviteCode }: { results: PublicResultsDTO; inviteCode: string }) {
  const voted = results.rows.some((r) => r.myValue !== null);
  const hasRatings = results.rows.some((r) => r.count > 0);

  return (
    <Container as="main" size="narrow" className="min-h-dvh pb-10 pt-6">
      <Link
        href={`/t/${inviteCode}`}
        className="-ml-2 mb-3 inline-flex h-10 items-center rounded-md px-2 text-sm font-medium text-ink-muted hover:text-ink"
      >
        ← К дегустации
      </Link>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Итоги · {SCALES[results.scale].label}</p>
        <h1 className="mt-1 break-words text-title">{results.title}</h1>
        <OrganizerLine organizer={results.organizer} className="mt-1" />
        <p className="mt-1 text-sm text-ink-muted">
          {results.publishedAt && (
            <>
              Опубликовано <LocalDate iso={results.publishedAt} /> ·{" "}
            </>
          )}
          {plural(results.guestsCount, ["участник", "участника", "участников"])}
        </p>
        {voted && <p className="mt-2 text-sm text-ink-muted">Рядом со средним баллом — ваша оценка.</p>}
      </header>

      {!hasRatings ? (
        <EmptyState icon="🍷" title="Оценок не было" text="В этой дегустации никто не успел проголосовать." />
      ) : (
        <ol className="space-y-2">
          {results.rows.map((row) => (
            <li key={row.tastingWineId}>
              <WineCard
                position={row.position}
                label={row.label}
                wine={row.wine}
                art={{ imageUrl: row.imageUrl }}
                highlighted={row.place === 1}
                badges={
                  row.place !== null ? (
                    <Badge tone={row.place <= 3 ? "accent" : "neutral"}>{row.place} место</Badge>
                  ) : (
                    <Badge>нет оценок</Badge>
                  )
                }
              >
                {row.avg !== null && row.avg100 !== null && (
                  <div className="mt-3 space-y-2">
                    <dl className={cx("grid gap-x-3 text-sm", voted ? "grid-cols-3" : "grid-cols-2")}>
                      <Stat label="Средний" value={formatScaleValue(results.scale, row.avg)} strong />
                      <Stat label="Голосов" value={String(row.count)} />
                      {voted && (
                        <Stat
                          label="Ваша оценка"
                          value={row.myValue !== null ? formatScaleValue(results.scale, row.myValue) : "—"}
                        />
                      )}
                    </dl>
                    <ProgressBar value={row.avg100 / 100} label={`Средний балл из 100: ${formatScore100(row.avg100)}`} />
                  </div>
                )}
              </WineCard>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-8 text-center text-sm text-ink-muted">
        Оценки дегустаций собираются в{" "}
        <Link href="/rating" className="font-medium text-primary underline-offset-4 hover:underline">
          Народный винный рейтинг
        </Link>
      </p>
    </Container>
  );
}
