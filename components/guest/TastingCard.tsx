import { TASTING_MODE_LABEL } from "@/lib/constants";
import type { GuestTastingDTO } from "@/lib/dto";
import { plural } from "@/lib/plural";
import { SCALES } from "@/lib/scales";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { LocalDate } from "../ui/LocalDate";
import { OrganizerLine } from "./OrganizerLine";

/** Карточка дегустации на входе по QR, до ввода имени. Названия вин в слепом режиме не показываем — только число. */
export function TastingCard({ view }: { view: GuestTastingDTO }) {
  const blind = view.mode === "blind";
  return (
    <Card raised className="mb-6">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={blind ? "primary" : "accent"}>{TASTING_MODE_LABEL[view.mode]} дегустация</Badge>
        <Badge>{view.wines.length > 0 ? plural(view.wines.length, ["вино", "вина", "вин"]) : "программа готовится"}</Badge>
        <Badge>{SCALES[view.scale].label}</Badge>
      </div>
      <h1 className="mt-3 break-words text-title">{view.title}</h1>
      {(view.startsAt || view.location) && (
        <p className="mt-1 text-sm text-ink-muted">
          {view.startsAt && <LocalDate iso={view.startsAt} />}
          {view.startsAt && view.location && " · "}
          {view.location}
        </p>
      )}
      <OrganizerLine organizer={view.organizer} className="mt-1" />
      {view.description && <p className="mt-3 whitespace-pre-line break-words text-sm text-ink">{view.description}</p>}
      {blind && (
        <p className="mt-3 text-sm text-ink-muted">
          Это слепая дегустация: вы увидите только номера вин. Названия откроют в конце.
        </p>
      )}
      <p className="mt-3 border-t border-line pt-3 text-sm text-ink-muted">Оценки анонимны, имя можно не вводить.</p>
    </Card>
  );
}
