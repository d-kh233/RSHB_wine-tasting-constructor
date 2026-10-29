"use client";

import type { GuestRatingDTO, GuestTastingDTO, GuestTastingWineDTO } from "@/lib/dto";
import { plural } from "@/lib/plural";
import { formatScaleValue } from "@/lib/scales";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { WineCard } from "../ui/WineCard";

/** «Вы поставили X, среднее Y» — для раскрытой бутылки. */
export function RevealLine({
  view,
  wine,
  rating,
}: {
  view: GuestTastingDTO;
  wine: GuestTastingWineDTO;
  rating: GuestRatingDTO | undefined;
}) {
  if (!wine.result) return null;
  return (
    <p className="mt-2 text-sm text-ink">
      {rating ? (
        <>
          Вы поставили <span className="font-medium">{formatScaleValue(view.scale, rating.value)}</span>
        </>
      ) : (
        "Вы не оценивали это вино"
      )}
      {", среднее "}
      <span className="font-medium text-primary">{formatScaleValue(view.scale, wine.result.avg)}</span>
      <span className="text-ink-muted"> · {plural(wine.result.count, ["оценка", "оценки", "оценок"])}</span>
    </p>
  );
}

/** Окно, которое само всплывает у гостя, когда организатор раскрыл бутылки. */
export function RevealModal({
  view,
  wines,
  onClose,
}: {
  view: GuestTastingDTO;
  wines: GuestTastingWineDTO[];
  onClose: () => void;
}) {
  const myRating = new Map(view.myRatings.map((r) => [r.tastingWineId, r]));
  return (
    <Modal
      open={wines.length > 0}
      onClose={onClose}
      title={wines.length === 1 ? `${wines[0].label} раскрыто` : `Раскрыто вин: ${wines.length}`}
    >
      <ul className="space-y-2">
        {wines.map((w) => (
          <li key={w.id}>
            <WineCard position={w.position} label={w.label} wine={w.wine} art={{ imageUrl: w.imageUrl, size: "lg" }}>
              <RevealLine view={view} wine={w} rating={myRating.get(w.id)} />
            </WineCard>
          </li>
        ))}
      </ul>
      <Button block size="lg" className="mt-4" onClick={onClose}>
        Понятно
      </Button>
    </Modal>
  );
}
