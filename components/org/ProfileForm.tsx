"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import type { ProfileDTO } from "@/lib/dto";
import { ProfileFields, type ProfileValues } from "../auth/ProfileFields";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";

const toValues = (p: ProfileDTO): ProfileValues => ({
  displayName: p.displayName,
  organization: p.organization ?? "",
  city: p.city ?? "",
  bio: p.bio ?? "",
});

/** Редактирование публичных данных организатора. locked — демо-аккаунт: он общий, менять нельзя. */
export function ProfileForm({ initial, locked }: { initial: ProfileDTO; locked: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => toValues(initial));
  const [values, setValues] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const dirty = (Object.keys(values) as (keyof ProfileValues)[]).some((k) => values[k] !== saved[k]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving || locked) return;
    setSaving(true);
    setMessage(null);
    try {
      const next = toValues(await api<ProfileDTO>("/api/profile", { method: "PATCH", body: values }));
      setSaved(next);
      setValues(next);
      setMessage({ tone: "success", text: "Сохранено" });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "danger", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {locked && <Alert tone="info">Это общий демо-аккаунт — профиль в нём менять нельзя.</Alert>}
      <ProfileFields values={values} onChange={setValues} disabled={saving || locked} />
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={saving} disabled={!dirty}>
            Сохранить
          </Button>
          {dirty && !saving && (
            <Button variant="ghost" onClick={() => setValues(saved)}>
              Отменить
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
