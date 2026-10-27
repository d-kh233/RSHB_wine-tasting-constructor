"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import type { OrgTastingDTO } from "@/lib/dto";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { formToPayload, TastingFields, tastingToForm, type TastingFormValues } from "./TastingFields";

export function SettingsForm({ tasting, onSaved }: { tasting: OrgTastingDTO; onSaved: (t: OrgTastingDTO) => void }) {
  const editable = tasting.status === "draft";
  // Дата зависит от часового пояса браузера → форму заполняем после монтирования, не на сервере.
  const [values, setValues] = useState<TastingFormValues | null>(null);
  const [saved, setSaved] = useState<TastingFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    const initial = tastingToForm(tasting);
    setValues(initial);
    setSaved(initial);
    // Форму сбрасываем только при смене дегустации, а не при каждом обновлении DTO.
  }, [tasting.id]);

  if (!values || !saved) return null;
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api<OrgTastingDTO>(`/api/org/${tasting.adminKey}`, {
        method: "PATCH",
        body: formToPayload(values),
      });
      const next = tastingToForm(updated);
      setValues(next);
      setSaved(next);
      onSaved(updated);
      setMessage({ tone: "success", text: "Настройки сохранены" });
    } catch (err) {
      setMessage({ tone: "danger", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!editable && (
        <Alert tone="info">Дегустация уже запущена — настройки заморожены, чтобы оценки гостей оставались сопоставимыми.</Alert>
      )}
      <TastingFields
        values={values}
        onChange={(v) => {
          setValues(v);
          setMessage(null);
        }}
        disabled={!editable || saving}
      />
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={saving} disabled={!dirty}>
            Сохранить
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={() => setValues(saved)} disabled={saving}>
              Отменить изменения
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
