"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import type { OrgTastingDTO, SummaryDTO, SummaryWineDTO } from "@/lib/dto";
import { plural } from "@/lib/plural";
import { formatScaleValue, formatScore100, type ScaleId } from "@/lib/scales";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button, buttonClass } from "../ui/Button";
import { Card } from "../ui/Card";
import { ConfirmModal } from "../ui/ConfirmModal";
import { CopyButton } from "../ui/CopyButton";
import { EmptyState } from "../ui/EmptyState";
import { ProgressBar } from "../ui/ProgressBar";
import { Skeleton } from "../ui/Skeleton";
import { Stat } from "../ui/Stat";
import { WineCard } from "../ui/WineCard";
import { ExportPanel } from "./ExportPanel";
import { ValidityPanel, VoteProtection } from "./ValidityPanel";
import { useOrgAction } from "./useOrgAction";

/** «Итоги»: сводка по винам, раскрытие бутылок, публикация, передача в рейтинг. */
export function ResultsPanel({
  tasting,
  onChange,
  resultsUrl,
}: {
  tasting: OrgTastingDTO;
  onChange: (t: OrgTastingDTO) => void;
  /** Абсолютная ссылка на итоги для гостей; null — NEXT_PUBLIC_BASE_URL не задан. */
  resultsUrl: string | null;
}) {
  const base = `/api/org/${tasting.adminKey}`;
  const { busy, error, run } = useOrgAction(tasting.adminKey, onChange);
  const [summary, setSummary] = useState<SummaryDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"close" | "publish" | null>(null);

  const load = useCallback(async () => {
    try {
      setSummary(await api<SummaryDTO>(`${base}/summary`));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, [base]);

  // Кабинет опрашивает дегустацию, пока она идёт: новые голоса, статус и раскрытия → свежая сводка.
  const revealedCount = tasting.wines.filter((w) => w.revealed).length;
  const closedCount = tasting.wines.filter((w) => w.status === "closed").length;
  useEffect(() => {
    load();
  }, [load, tasting.status, tasting.ratingsCount, revealedCount, closedCount]);

  const blind = tasting.mode === "blind";
  const closed = tasting.status === "closed";
  const running = tasting.status === "running";
  const allRevealed = revealedCount === tasting.wines.length;
  const allClosed = closedCount === tasting.wines.length;
  // Раскрывать бутылку можно, как только закрыто голосование по ней; «Раскрыть все» — когда закрыты все вина.
  const canReveal = (row: SummaryWineDTO) => blind && (running || closed) && row.status === "closed" && !row.revealed;

  const setStatus = (action: "close" | "publish") =>
    run(action, () => api<OrgTastingDTO>(`${base}/status`, { body: { action } }));
  const reveal = (twId: string) => run(`reveal:${twId}`, () => api<OrgTastingDTO>(`${base}/wines/${twId}/reveal`, {
    method: "POST",
  }));
  const revealAll = () => run("reveal-all", () => api<OrgTastingDTO>(`${base}/reveal-all`, { method: "POST" }));

  const resultsPath = `/t/${tasting.inviteCode}/results`;

  return (
    <div className="space-y-8">
      <Card className="space-y-4">
        {tasting.status === "draft" && (
          <p className="text-ink-muted">Дегустация ещё не запущена — сводка появится, когда гости начнут оценивать.</p>
        )}

        {tasting.status === "running" && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">
              Дегустация идёт — сводка обновляется сама. Опубликовать итоги можно после завершения.
              {blind && " Бутылку можно раскрыть, как только закрыто голосование по ней."}
            </p>
            <Button variant="danger" onClick={() => setConfirm("close")} disabled={busy !== null} className="shrink-0">
              Завершить дегустацию
            </Button>
          </div>
        )}

        {blind && (running || closed) && (
          <div className="flex flex-col gap-3 border-t border-line pt-4 first:border-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">
                Раскрыто бутылок: {revealedCount} из {tasting.wines.length}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Раскрытое вино гость видит под своим номером вместе со своей оценкой и средним.
                {allClosed
                  ? " Раскрывайте по одной или все сразу."
                  : " «Раскрыть все» станет доступно, когда закрыты все вина."}
              </p>
              <ProgressBar
                value={tasting.wines.length ? revealedCount / tasting.wines.length : 0}
                label="Раскрыто бутылок"
                className="mt-2"
              />
            </div>
            {!allRevealed && (
              <Button
                variant="secondary"
                onClick={revealAll}
                loading={busy === "reveal-all"}
                disabled={busy !== null || !allClosed}
                className="shrink-0"
              >
                Раскрыть все
              </Button>
            )}
          </div>
        )}

        {closed && (
          <div className="flex flex-col gap-3 border-t border-line pt-4 first:border-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">
              {blind && !allRevealed
                ? "Опубликовать итоги можно, когда раскрыты все бутылки."
                : "Итоги увидят гости и все, у кого есть код дегустации."}
            </p>
            <Button
              onClick={() => setConfirm("publish")}
              disabled={busy !== null || (blind && !allRevealed)}
              className="shrink-0"
            >
              Опубликовать итоги
            </Button>
          </div>
        )}

        {tasting.status === "published" && (
          <div className="space-y-3">
            <Alert tone="success">Итоги опубликованы — гости видят места и средние баллы.</Alert>
            <div className="flex flex-wrap gap-2">
              <Link href={resultsPath} target="_blank" rel="noopener" className={buttonClass({ variant: "secondary" })}>
                Страница итогов ↗
              </Link>
              <CopyButton
                text={() => resultsUrl ?? `${window.location.origin}${resultsPath}`}
                label="Копировать ссылку"
                variant="ghost"
              />
            </div>
          </div>
        )}

        {error && <Alert tone="danger">{error}</Alert>}
      </Card>

      <section aria-labelledby="summary-title">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="summary-title" className="text-xl">
            Сводка
          </h2>
          {summary && (
            <span className="text-sm text-ink-muted">
              {plural(summary.totalRatings, ["оценка", "оценки", "оценок"])} от{" "}
              {plural(summary.guestsCount, ["гостя", "гостей", "гостей"])}
            </span>
          )}
        </div>
        {loadError && (
          <Alert tone="danger" className="mb-3">
            {loadError}{" "}
            <button type="button" onClick={load} className="font-medium underline">
              Повторить
            </button>
          </Alert>
        )}
        {!summary && !loadError && (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}
        {summary && summary.totalRatings === 0 && (
          <EmptyState
            icon="📊"
            title="Оценок пока нет"
            text={
              tasting.status === "running"
                ? "Откройте вино на шаге «Проведение» — голоса появятся здесь сами."
                : "Без оценок нечего показывать и передавать в рейтинг."
            }
          />
        )}
        {summary && summary.totalRatings > 0 && (
          <ol className="space-y-2">
            {summary.wines.map((row) => (
              <li key={row.tastingWineId}>
                <SummaryRow
                  row={row}
                  scale={summary.scale}
                  blind={blind}
                  revealAction={
                    canReveal(row) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => reveal(row.tastingWineId)}
                        loading={busy === `reveal:${row.tastingWineId}`}
                        disabled={busy !== null}
                      >
                        Раскрыть №{row.position}
                      </Button>
                    )
                  }
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      {summary && tasting.status !== "draft" && <ValidityPanel summary={summary} />}

      {(tasting.status === "closed" || tasting.status === "published") && (
        <ExportPanel adminKey={tasting.adminKey} ratingsCount={summary?.totalRatings ?? tasting.ratingsCount} />
      )}

      <VoteProtection />

      <ConfirmModal
        open={confirm === "close"}
        title="Завершить дегустацию?"
        confirmLabel="Завершить"
        variant="danger"
        loading={busy === "close"}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (await setStatus("close")) setConfirm(null);
        }}
      >
        <p>Приём оценок прекратится, все открытые вина закроются. Вернуть дегустацию в работу будет нельзя.</p>
      </ConfirmModal>
      <ConfirmModal
        open={confirm === "publish"}
        title="Опубликовать итоги?"
        confirmLabel="Опубликовать"
        loading={busy === "publish"}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (await setStatus("publish")) setConfirm(null);
        }}
      >
        <p>Гости увидят места, средние баллы и свои оценки. Новые гости войти уже не смогут.</p>
        <p className="text-ink-muted">Имена гостей и заметки в публичные итоги не попадают.</p>
      </ConfirmModal>
    </div>
  );
}

function SummaryRow({
  row,
  scale,
  blind,
  revealAction,
}: {
  row: SummaryWineDTO;
  scale: ScaleId;
  blind: boolean;
  revealAction: ReactNode;
}) {
  const top = row.place !== null && row.place <= 3;
  return (
    <WineCard
      position={row.position}
      label={row.label}
      wine={row.wine}
      highlighted={row.place === 1}
      badges={
        <>
          {row.place !== null ? (
            <Badge tone={top ? "accent" : "neutral"}>{row.place} место</Badge>
          ) : (
            <Badge>нет оценок</Badge>
          )}
          {blind && !row.revealed && <Badge tone="primary">скрыто от гостей</Badge>}
          {row.belowMinGuests && row.count > 0 && <Badge tone="warning">меньше минимума гостей</Badge>}
        </>
      }
      actions={revealAction}
    >
      {row.count > 0 && row.avg !== null && row.avg100 !== null && (
        <div className="mt-3 space-y-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <Stat label="Средний" value={formatScaleValue(scale, row.avg)} strong />
            <Stat label="Из 100" value={formatScore100(row.avg100)} />
            <Stat label="Голосов" value={String(row.count)} />
            <Stat
              label="Разброс"
              value={row.min === row.max ? "—" : `${formatScaleValue(scale, row.min!)} – ${formatScaleValue(scale, row.max!)}`}
            />
          </dl>
          <ProgressBar value={row.avg100 / 100} label={`Средний балл из 100: ${formatScore100(row.avg100)}`} />
        </div>
      )}
      {row.notes.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer select-none text-sm font-medium text-primary">
            Заметки гостей ({row.notes.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {row.notes.map((note, i) => (
              <li key={i} className="break-words rounded-md bg-surface-muted px-3 py-2 text-sm italic text-ink">
                «{note}»
              </li>
            ))}
          </ul>
        </details>
      )}
    </WineCard>
  );
}
