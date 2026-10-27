"use client";

import { useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import { LIMITS } from "@/lib/constants";
import type { GuestTastingDTO } from "@/lib/dto";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { ResultsLink } from "./WineList";

export function JoinForm({
  view,
  onJoined,
}: {
  view: GuestTastingDTO;
  /** Перечитать анкету после входа; возвращает новое состояние или null при сетевой ошибке. */
  onJoined: () => Promise<GuestTastingDTO | null>;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);

  if (view.status === "published") {
    return <ResultsLink inviteCode={view.inviteCode} />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await api(`/api/t/${view.inviteCode}/join`, { body: { displayName: name.trim() || null } });
      const next = await onJoined();
      if (next && !next.me) {
        setError("Браузер не сохранил вход (cookie заблокированы?). Разрешите cookie для этого сайта и попробуйте ещё раз.");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Как вас зовут?" hint="Имя увидит только организатор. Можно оставить пустым.">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={LIMITS.DISPLAY_NAME_MAX}
          placeholder="Например, Анна"
          autoComplete="nickname"
          enterKeyHint="go"
        />
      </Field>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" size="lg" block loading={submitting}>
        Войти в дегустацию
      </Button>
      <p className="text-center text-xs text-ink-muted">Без регистрации. Вход запомнится на этом телефоне.</p>
    </form>
  );
}
