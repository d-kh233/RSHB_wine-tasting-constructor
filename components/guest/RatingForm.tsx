"use client";

import { useRef, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/apiClient";
import { LIMITS } from "@/lib/constants";
import type { GuestRatingDTO, GuestTastingDTO, GuestTastingWineDTO } from "@/lib/dto";
import { SCALES } from "@/lib/scales";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Container } from "../ui/Container";
import { ProgressBar } from "../ui/ProgressBar";
import { Textarea } from "../ui/Field";
import { ScaleInput } from "../ui/ScaleInput";
import { WineCard } from "../ui/WineCard";

export function RatingForm({
  view,
  wine,
  onBack,
  onRated,
  onAlreadyRated,
  onStale,
}: {
  view: GuestTastingDTO;
  wine: GuestTastingWineDTO;
  onBack: () => void;
  onRated: (rating: GuestRatingDTO) => void;
  /** 409 DUPLICATE_RATING — оценка уже есть (двойной клик, вторая вкладка): показываем сохранённую. */
  onAlreadyRated: () => void;
  /** Состояние на сервере поменялось (вино закрыли, вход потерян) — перечитать анкету. */
  onStale: () => void;
}) {
  const [value, setValue] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Защита от двойного клика: state обновляется асинхронно, ref — сразу.
  const lock = useRef(false);

  const canRate = view.status === "running" && wine.status === "open";

  async function submit() {
    if (lock.current || value === null || !canRate) return;
    lock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const { rating } = await api<{ rating: GuestRatingDTO }>(`/api/t/${view.inviteCode}/ratings`, {
        body: { tastingWineId: wine.id, value, note: view.notesEnabled ? note.trim() || null : null },
      });
      onRated(rating);
      return; // экран сменится — кнопку не разблокируем
    } catch (err) {
      if (err instanceof ApiError && err.code === "DUPLICATE_RATING") {
        onAlreadyRated();
        return;
      }
      // Заметка и выбранная оценка остаются в форме — ничего не теряется.
      setError(errorMessage(err));
      if (err instanceof ApiError && (err.status === 409 || err.status === 401)) onStale();
    }
    lock.current = false;
    setSubmitting(false);
  }

  return (
    <div className="pb-28">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 mb-3 flex h-10 items-center rounded-md px-2 text-sm font-medium text-ink-muted hover:text-ink"
      >
        ← Все вина
      </button>

      <p className="mb-2 text-sm font-medium text-ink-muted" aria-live="polite">
        Вино {wine.position} из {view.wines.length}
      </p>
      <ProgressBar value={wine.position / view.wines.length} label={`Вино ${wine.position} из ${view.wines.length}`} className="mb-3" />

      <WineCard
        position={wine.position}
        label={wine.label}
        wine={wine.wine}
        art={{ imageUrl: wine.imageUrl, size: "lg" }}
      />

      {!canRate && (
        <Alert tone={wine.status === "pending" && view.status !== "closed" ? "info" : "warning"} className="mt-4">
          {view.status === "closed" || view.status === "published"
            ? "Приём оценок завершён."
            : wine.status === "pending"
              ? "Ждём, пока организатор откроет голосование."
              : "Вино закрыто организатором — оценку отправить нельзя."}
          {note.trim() && " Заметка осталась в поле ниже — её можно скопировать."}
        </Alert>
      )}

      <section className="mt-6" aria-labelledby="score-label">
        <h2 id="score-label" className="mb-1 text-lg">
          Ваша оценка
        </h2>
        <p className="mb-4 text-sm text-ink-muted">{SCALES[view.scale].hint}</p>
        <ScaleInput scaleId={view.scale} value={value} onChange={setValue} disabled={submitting || !canRate} />
      </section>

      {view.notesEnabled && (
        <section className="mt-6">
          <label htmlFor="note" className="mb-1.5 block text-lg font-serif text-ink">
            Заметка <span className="font-sans text-sm text-ink-muted">— необязательно</span>
          </label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={LIMITS.NOTE_MAX}
            rows={3}
            placeholder="Аромат, вкус, послевкусие…"
            disabled={submitting}
          />
          <p className="mt-1 text-right text-xs text-ink-muted">
            {note.length} / {LIMITS.NOTE_MAX}
          </p>
        </section>
      )}

      {error && (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
        <Container size="narrow">
          <Button size="lg" block onClick={submit} loading={submitting} disabled={value === null || !canRate}>
            {value === null ? "Выберите оценку" : "Отправить оценку"}
          </Button>
          <p className="mt-2 text-center text-xs text-ink-muted">Изменить оценку после отправки нельзя</p>
        </Container>
      </div>
    </div>
  );
}
