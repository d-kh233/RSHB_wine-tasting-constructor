import type { GuestRatingDTO, GuestTastingDTO, GuestTastingWineDTO } from "@/lib/dto";
import { formatScaleValue } from "@/lib/scales";
import { Button } from "../ui/Button";

export function ThankYou({
  view,
  wine,
  rating,
  repeated,
  next,
  onNext,
  onList,
}: {
  view: GuestTastingDTO;
  wine: GuestTastingWineDTO;
  rating: GuestRatingDTO | undefined;
  /** true — пришли после 409: оценка была сохранена раньше (двойной клик / другая вкладка). */
  repeated: boolean;
  /** Следующее открытое и не оценённое вино. */
  next: GuestTastingWineDTO | undefined;
  onNext: (id: string) => void;
  onList: () => void;
}) {
  return (
    <div className="flex flex-col items-center pt-6 text-center">
      <div
        aria-hidden
        className="flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-4xl text-success"
      >
        ✓
      </div>
      <h1 className="mt-5 text-3xl">{repeated ? "Оценка уже сохранена" : "Спасибо!"}</h1>
      <p className="mt-2 text-ink-muted">
        {wine.wine ? wine.wine.name : wine.label}
        {rating && (
          <>
            {" — "}
            <span className="font-medium text-ink">{formatScaleValue(view.scale, rating.value)}</span>
          </>
        )}
      </p>
      {repeated && <p className="mt-1 text-sm text-ink-muted">Повторно проголосовать за одно вино нельзя.</p>}
      {rating?.note && <p className="mt-3 max-w-sm break-words text-sm italic text-ink-muted">«{rating.note}»</p>}

      <div className="mt-8 w-full space-y-2">
        {next && (
          <Button size="lg" block onClick={() => onNext(next.id)}>
            Оценить {next.label} →
          </Button>
        )}
        <Button size="lg" block variant={next ? "secondary" : "primary"} onClick={onList}>
          К списку вин
        </Button>
      </div>
      {!next && view.status === "running" && (
        <p className="mt-4 text-sm text-ink-muted">Следующее вино появится, когда его откроет организатор.</p>
      )}
    </div>
  );
}
