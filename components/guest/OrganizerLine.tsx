import type { PublicOrganizerDTO } from "@/lib/dto";
import { cx } from "../ui/cx";

/** «Организатор: имя, организация, город» — одинаково на входе в дегустацию и в итогах. */
export function OrganizerLine({ organizer, className }: { organizer: PublicOrganizerDTO | null; className?: string }) {
  if (!organizer) return null;
  const details = [organizer.organization, organizer.city].filter(Boolean).join(", ");
  return (
    <p className={cx("break-words text-sm text-ink-muted", className)}>
      Организатор: <span className="font-medium text-ink">{organizer.name}</span>
      {details && `, ${details}`}
    </p>
  );
}
