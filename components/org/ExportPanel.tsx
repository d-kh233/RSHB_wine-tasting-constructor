"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import { REJECT_REASON, REJECT_REASON_LABEL, type RejectReason } from "@/lib/constants";
import type { ImportResultDTO, RatingExportV1 } from "@/lib/dto";
import { plural } from "@/lib/plural";
import { NORMALIZATION_FORMULAS } from "@/lib/scales";
import { Alert } from "../ui/Alert";
import { Button, buttonClass } from "../ui/Button";
import { Card } from "../ui/Card";
import { cx } from "../ui/cx";

const RATINGS: [string, string, string] = ["оценка", "оценки", "оценок"];

/** Сколько вин и оценок показывать в примере JSON — остальное сокращаем. */
const SAMPLE_WINES = 2;
const SAMPLE_RATINGS = 3;

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
          В рейтинг уходят только валидные оценки — анонимно, без имён и заметок: исходное значение, шкала и оценка,
          приведённая к 0–100 и к 1–5. Повторная передача не создаёт дублей.
        </p>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer select-none font-medium text-primary">Как считается normalized</summary>
          <div className="mt-2 space-y-1 rounded-md bg-surface-muted px-3 py-2">
            {NORMALIZATION_FORMULAS.map((f) => (
              <p key={f} className="break-words font-mono text-xs text-ink">
                {f}
              </p>
            ))}
            <p className="text-xs text-ink-muted">
              min и max — границы шкалы дегустации, округление до 0,1. Пример: 8 из 10 → (8 − 1) / 9 × 100 = 77,8 и
              1 + 4 × 7/9 = 4,1.
            </p>
          </div>
        </details>
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

      {!empty && <JsonSample exportUrl={exportUrl} />}

      {empty && <p className="text-sm text-ink-muted">Оценок нет — передавать нечего.</p>}
      {error && <Alert tone="danger">{error}</Alert>}
      {outcome && <OutcomeAlert outcome={outcome} />}
    </Card>
  );
}

function OutcomeAlert({ outcome: { result, filtered } }: { outcome: Outcome }) {
  // Новый exportId (например, после смены версии формата), но все оценки уже в рейтинге — их отсёк UNIQUE.
  const allKnown =
    !result.repeated &&
    result.accepted === 0 &&
    result.rejected > 0 &&
    result.reasons.every((r) => r.reason === REJECT_REASON.ALREADY_IMPORTED);
  return (
    <Alert tone={result.accepted > 0 || result.repeated || allKnown ? "success" : "warning"}>
      <p className="font-medium">
        {result.repeated || allKnown
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

/** Сворачиваемый пример: тот же экспорт, что уйдёт в рейтинг, сокращённый до пары вин и оценок. */
function JsonSample({ exportUrl }: { exportUrl: string }) {
  const [sample, setSample] = useState<{ json: string; hidden: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (sample) return;
    try {
      const payload = await api<RatingExportV1>(exportUrl);
      const short = {
        ...payload,
        wines: payload.wines.slice(0, SAMPLE_WINES),
        ratings: payload.ratings.slice(0, SAMPLE_RATINGS),
      };
      const hidden =
        payload.wines.length - short.wines.length + (payload.ratings.length - short.ratings.length);
      setSample({ json: JSON.stringify(short, null, 2), hidden });
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <details onToggle={(e) => e.currentTarget.open && load()} className="text-sm">
      <summary className="cursor-pointer select-none font-medium text-primary">Пример JSON из этой дегустации</summary>
      {error && (
        <Alert tone="danger" className="mt-2">
          {error}
        </Alert>
      )}
      {!sample && !error && <p className="mt-2 text-ink-muted">Загружаем…</p>}
      {sample && (
        <>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink">
            {sample.json}
          </pre>
          {sample.hidden > 0 && (
            <p className="mt-1 text-xs text-ink-muted">
              Сокращено: показаны первые {SAMPLE_WINES} вина и {SAMPLE_RATINGS} оценки. Полный файл — «Скачать JSON».
            </p>
          )}
        </>
      )}
    </details>
  );
}
