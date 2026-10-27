"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import { REJECT_REASON_LABEL, type RejectReason } from "@/lib/constants";
import type { ImportResultDTO, RatingExportV1 } from "@/lib/dto";
import { plural } from "@/lib/plural";
import { Alert } from "../ui/Alert";
import { Button, buttonClass } from "../ui/Button";
import { Card } from "../ui/Card";
import { cx } from "../ui/cx";

const RATINGS: [string, string, string] = ["оценка", "оценки", "оценок"];

const reasonLabel = (reason: string) => REJECT_REASON_LABEL[reason as RejectReason] ?? reason;

interface Outcome {
  result: ImportResultDTO;
  /** Оценки, отсеянные ещё при формировании экспорта. */
  filtered: RatingExportV1["stats"]["rejected"];
}

/**
 * «Передать в рейтинг»: берём экспорт по контракту и отправляем его в POST /api/rating/import —
 * так же, как это делала бы внешняя система. Повтор безопасен: импорт идемпотентен по exportId.
 */
export function ExportPanel({ adminKey, ratingsCount }: { adminKey: string; ratingsCount: number }) {
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exportUrl = `/api/org/${adminKey}/export`;
  const empty = ratingsCount === 0;

  async function send() {
    if (lock.current) return;
    lock.current = true;
    setSending(true);
    setError(null);
    try {
      const payload = await api<RatingExportV1>(exportUrl);
      const result = await api<ImportResultDTO>("/api/rating/import", { body: payload });
      setOutcome({ result, filtered: payload.stats.rejected });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      lock.current = false;
      setSending(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-xl">Народный винный рейтинг</h2>
        <p className="mt-1 text-sm text-ink-muted">
          В рейтинг уходят только валидные оценки — анонимно, без имён и заметок, приведённые к шкале 0–100. Повторная
          передача не создаёт дублей.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={send} loading={sending} disabled={empty}>
          Передать в рейтинг
        </Button>
        {empty ? (
          <span className={cx(buttonClass({ variant: "secondary" }), "cursor-not-allowed opacity-50")} aria-disabled="true">
            Скачать JSON
          </span>
        ) : (
          <a href={`${exportUrl}?download=1`} download className={buttonClass({ variant: "secondary" })}>
            Скачать JSON
          </a>
        )}
        <Link href="/rating" target="_blank" rel="noopener" className={buttonClass({ variant: "ghost" })}>
          Открыть рейтинг ↗
        </Link>
      </div>

      {empty && <p className="text-sm text-ink-muted">Оценок нет — передавать нечего.</p>}
      {error && <Alert tone="danger">{error}</Alert>}
      {outcome && <OutcomeAlert outcome={outcome} />}
    </Card>
  );
}

function OutcomeAlert({ outcome: { result, filtered } }: { outcome: Outcome }) {
  return (
    <Alert tone={result.accepted > 0 || result.repeated ? "success" : "warning"}>
      <p className="font-medium">
        {result.repeated
          ? "Эти оценки уже были переданы — повтор не создал дублей."
          : `Передано в рейтинг: ${plural(result.accepted, RATINGS)}.`}
      </p>
      <p className="mt-1">
        {result.repeated && `Принято ранее: ${result.accepted}. `}
        {result.rejected > 0 ? `Отклонено рейтингом: ${result.rejected}.` : "Рейтинг ничего не отклонил."}
      </p>
      {[...result.reasons, ...filtered].length > 0 && (
        <ul className="mt-1 list-inside list-disc">
          {result.reasons.map((r) => (
            <li key={`import-${r.reason}`}>
              {reasonLabel(r.reason)} — {r.count}
            </li>
          ))}
          {filtered.map((r) => (
            <li key={`export-${r.reason}`}>
              не прошло в экспорт: {reasonLabel(r.reason)} — {r.count}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 break-all font-mono text-xs opacity-80">exportId: {result.exportId}</p>
    </Alert>
  );
}
