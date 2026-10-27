"use client";

import { LIMITS, TASTING_MODE_LABEL, TASTING_MODES, type TastingMode } from "@/lib/constants";
import type { OrgTastingDTO } from "@/lib/dto";
import { SCALE_IDS, SCALES, type ScaleId } from "@/lib/scales";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import { Field, Input, Textarea } from "../ui/Field";

/** Значения формы как в контролах: дата — строка datetime-local в поясе браузера. */
export interface TastingFormValues {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  mode: TastingMode;
  scale: ScaleId;
  notesEnabled: boolean;
}

export const EMPTY_TASTING_FORM: TastingFormValues = {
  title: "",
  description: "",
  location: "",
  startsAt: "",
  mode: "blind",
  scale: "points100",
  notesEnabled: true,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → значение <input type="datetime-local"> в часовом поясе браузера. Вызывать только на клиенте. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function tastingToForm(t: OrgTastingDTO): TastingFormValues {
  return {
    title: t.title,
    description: t.description ?? "",
    location: t.location ?? "",
    startsAt: isoToLocalInput(t.startsAt),
    mode: t.mode,
    scale: t.scale,
    notesEnabled: t.notesEnabled,
  };
}

/** Тело запроса для POST /api/tastings и PATCH /api/org/[k]. */
export function formToPayload(v: TastingFormValues) {
  return {
    title: v.title,
    description: v.description || null,
    location: v.location || null,
    startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null,
    mode: v.mode,
    scale: v.scale,
    notesEnabled: v.notesEnabled,
  };
}

const MODE_HINT: Record<TastingMode, string> = {
  open: "Гости сразу видят название, производителя и год",
  blind: "Гости видят только «Вино №N», пока вы не раскроете бутылку",
};

export function TastingFields({
  values,
  onChange,
  disabled,
}: {
  values: TastingFormValues;
  onChange: (values: TastingFormValues) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof TastingFormValues>(key: K, value: TastingFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="space-y-5">
      <Field label="Название" hint="Например, «Пятничная слепая: красные Кубани»">
        <Input
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
          minLength={LIMITS.TITLE_MIN}
          maxLength={LIMITS.TITLE_MAX}
          disabled={disabled}
        />
      </Field>

      <ChoiceGroup
        name="mode"
        label="Режим"
        value={values.mode}
        onChange={(v) => set("mode", v)}
        disabled={disabled}
        choices={TASTING_MODES.map((m) => ({ value: m, label: TASTING_MODE_LABEL[m], hint: MODE_HINT[m] }))}
      />

      <ChoiceGroup
        name="scale"
        label="Шкала оценок"
        columns={3}
        value={values.scale}
        onChange={(v) => set("scale", v)}
        disabled={disabled}
        choices={SCALE_IDS.map((id) => ({ value: id, label: SCALES[id].label, hint: SCALES[id].hint }))}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Место" hint="Необязательно">
          <Input
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
            maxLength={LIMITS.LOCATION_MAX}
            disabled={disabled}
          />
        </Field>
        <Field label="Дата и время" hint="Необязательно">
          <Input
            type="datetime-local"
            value={values.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
            disabled={disabled}
          />
        </Field>
      </div>

      <Field label="Описание для гостей" hint={`Необязательно, до ${LIMITS.DESCRIPTION_MAX} символов`}>
        <Textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={LIMITS.DESCRIPTION_MAX}
          rows={3}
          disabled={disabled}
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={values.notesEnabled}
          onChange={(e) => set("notesEnabled", e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
        />
        <span>
          <span className="block text-sm font-medium text-ink">Заметки гостей</span>
          <span className="block text-xs text-ink-muted">
            Гость может оставить короткий комментарий к оценке (до {LIMITS.NOTE_MAX} символов)
          </span>
        </span>
      </label>
    </div>
  );
}
