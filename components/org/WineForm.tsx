"use client";

import { useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import { LIMITS, WINE_COLOR_LABEL, WINE_COLORS, type WineColor } from "@/lib/constants";
import type { WineDTO } from "@/lib/dto";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field, Input, Select } from "../ui/Field";

const EMPTY = { name: "", producer: "", vintage: "", region: "", country: "", grape: "", color: "", priceRub: "" };

const toNumber = (v: string) => (v.trim() === "" ? null : Number(v));

/** «Добавить своё вино»: создаёт вино в каталоге, дальше решает родитель (обычно — добавить в программу). */
export function WineForm({
  onCreated,
  onCancel,
  submitLabel,
  extraError,
}: {
  onCreated: (wine: WineDTO) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  /** Ошибка следующего шага (добавления в программу) — показываем в этой же форме. */
  extraError?: string | null;
}) {
  const [values, setValues] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Вино уже создано, но следующий шаг упал: повторная отправка не плодит дубль в каталоге.
  const created = useRef<WineDTO | null>(null);

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => {
    created.current = null;
    setValues((v) => ({ ...v, [key]: e.target.value }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      created.current ??= await api<WineDTO>("/api/wines", {
        body: {
          name: values.name,
          producer: values.producer || null,
          vintage: toNumber(values.vintage),
          region: values.region || null,
          country: values.country || null,
          grape: values.grape || null,
          color: (values.color || null) as WineColor | null,
          priceRub: toNumber(values.priceRub),
        },
      });
      await onCreated(created.current);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const year = new Date().getFullYear();
  const shownError = error ?? extraError;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Название *">
        <Input
          value={values.name}
          onChange={set("name")}
          required
          minLength={LIMITS.WINE_NAME_MIN}
          maxLength={LIMITS.WINE_NAME_MAX}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Производитель" className="col-span-2">
          <Input value={values.producer} onChange={set("producer")} maxLength={LIMITS.WINE_TEXT_MAX} />
        </Field>
        <Field label="Год урожая">
          <Input
            type="number"
            inputMode="numeric"
            min={LIMITS.VINTAGE_MIN}
            max={year}
            value={values.vintage}
            onChange={set("vintage")}
          />
        </Field>
        <Field label="Цвет">
          <Select value={values.color} onChange={set("color")}>
            <option value="">—</option>
            {WINE_COLORS.map((c) => (
              <option key={c} value={c}>
                {WINE_COLOR_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Регион">
          <Input value={values.region} onChange={set("region")} maxLength={LIMITS.WINE_TEXT_MAX} />
        </Field>
        <Field label="Страна">
          <Input value={values.country} onChange={set("country")} maxLength={LIMITS.WINE_TEXT_MAX} />
        </Field>
        <Field label="Сорт винограда">
          <Input value={values.grape} onChange={set("grape")} maxLength={LIMITS.WINE_TEXT_MAX} />
        </Field>
        <Field label="Цена, ₽">
          <Input type="number" inputMode="numeric" min={0} value={values.priceRub} onChange={set("priceRub")} />
        </Field>
      </div>
      {shownError && <Alert tone="danger">{shownError}</Alert>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Отмена
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
