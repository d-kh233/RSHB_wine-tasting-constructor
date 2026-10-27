import Link from "next/link";
import type { GuestRatingDTO, GuestTastingDTO, GuestTastingWineDTO } from "@/lib/dto";
import { formatScaleValue } from "@/lib/scales";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { buttonClass } from "../ui/Button";
import { cx } from "../ui/cx";
import { WineCard } from "../ui/WineCard";

/** Открытые и ещё не оценённые гостем вина — их можно оценить прямо сейчас. */
export function ratableWines(view: GuestTastingDTO): GuestTastingWineDTO[] {
  if (view.status !== "running") return [];
  const rated = new Set(view.myRatings.map((r) => r.tastingWineId));
  return view.wines.filter((w) => w.status === "open" && !rated.has(w.id));
}

function StatusBanner({ view, ratableCount }: { view: GuestTastingDTO; ratableCount: number }) {
  switch (view.status) {
    case "draft":
      return (
        <Alert tone="info">
          Дегустация ещё не началась. Как только организатор откроет первое вино, оно появится здесь — обновлять страницу
          не нужно.
        </Alert>
      );
    case "closed":
      return (
        <Alert tone="info">
          Приём оценок завершён.{" "}
          {view.mode === "blind"
            ? "Организатор раскрывает бутылки — названия появятся прямо в списке. "
            : ""}
          Итоги появятся после публикации.
        </Alert>
      );
    case "published":
      return <ResultsLink inviteCode={view.inviteCode} />;
    default: {
      if (ratableCount > 0) return null;
      const allDone = view.wines.length > 0 && view.myRatings.length >= view.wines.length;
      return (
        <Alert tone={allDone ? "success" : "info"}>
          {allDone ? "Вы оценили все вина. Спасибо!" : "Ждём следующее вино — список обновится сам."}
        </Alert>
      );
    }
  }
}

export function WineList({ view, onRate }: { view: GuestTastingDTO; onRate: (tastingWineId: string) => void }) {
  const ratable = ratableWines(view);
  const ratableIds = new Set(ratable.map((w) => w.id));
  const myRating = new Map<string, GuestRatingDTO>(view.myRatings.map((r) => [r.tastingWineId, r]));
  const rest = view.wines.filter((w) => !ratableIds.has(w.id));

  return (
    <div className="space-y-6">
      <StatusBanner view={view} ratableCount={ratable.length} />

      {ratable.length > 0 && (
        <section aria-labelledby="now-open">
          <h2 id="now-open" className="mb-2 text-lg">
            Сейчас оцениваем
          </h2>
          <ul className="space-y-2">
            {ratable.map((w) => (
              <li key={w.id}>
                <button type="button" onClick={() => onRate(w.id)} className="block w-full text-left">
                  <WineCard
                    position={w.position}
                    label={w.label}
                    wine={w.wine}
                    highlighted
                    actions={<span className="text-sm font-medium text-primary">Оценить →</span>}
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="program">
          <h2 id="program" className="mb-2 text-lg">
            Программа
          </h2>
          <ul className="space-y-2">
            {rest.map((w) => {
              const rating = myRating.get(w.id);
              return (
                <li key={w.id}>
                  <WineCard
                    position={w.position}
                    label={w.label}
                    wine={w.wine}
                    className={rating ? undefined : "opacity-80"}
                    badges={
                      rating ? (
                        <Badge tone="success">✓ ваша оценка {formatScaleValue(view.scale, rating.value)}</Badge>
                      ) : w.status === "pending" ? (
                        <Badge>скоро</Badge>
                      ) : (
                        <Badge tone="neutral">не оценено</Badge>
                      )
                    }
                  >
                    {rating?.note && <p className="mt-2 break-words text-sm italic text-ink-muted">«{rating.note}»</p>}
                  </WineCard>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {view.wines.length === 0 && <Alert tone="info">Организатор ещё собирает программу.</Alert>}
    </div>
  );
}

export function ResultsLink({ inviteCode }: { inviteCode: string }) {
  return (
    <Alert tone="success">
      <p className="font-medium">Итоги дегустации опубликованы!</p>
      <Link href={`/t/${inviteCode}/results`} className={cx(buttonClass({ block: true }), "mt-3")}>
        Смотреть итоги →
      </Link>
    </Alert>
  );
}
