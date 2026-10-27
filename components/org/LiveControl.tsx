"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";
import { WINE_STATUS_LABEL, type TastingAction, type WineAction, type WineStatus } from "@/lib/constants";
import type { OrgTastingDTO, OrgTastingWineDTO } from "@/lib/dto";
import { plural } from "@/lib/plural";
import type { InviteInfo } from "@/lib/qr";
import { Alert } from "../ui/Alert";
import { Badge, type BadgeTone } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ConfirmModal } from "../ui/ConfirmModal";
import { ProgressBar } from "../ui/ProgressBar";
import { WineCard } from "../ui/WineCard";
import { InvitePanel } from "./InvitePanel";
import { useOrgAction } from "./useOrgAction";

const WINE_TONE: Record<WineStatus, BadgeTone> = {
  pending: "neutral",
  open: "success",
  closed: "warning",
};

const GUESTS: [string, string, string] = ["гость", "гостя", "гостей"];
const RATINGS: [string, string, string] = ["оценка", "оценки", "оценок"];

/** «Проведение»: запуск и завершение, открытие вин по одному, счётчик голосов, приглашение. */
export function LiveControl({
  tasting,
  invite,
  onChange,
  onGoResults,
}: {
  tasting: OrgTastingDTO;
  invite: InviteInfo;
  onChange: (t: OrgTastingDTO) => void;
  onGoResults: () => void;
}) {
  const { busy, error, run } = useOrgAction(tasting.adminKey, onChange);
  const [confirmClose, setConfirmClose] = useState(false);
  const base = `/api/org/${tasting.adminKey}`;
  const running = tasting.status === "running";

  const setStatus = (action: TastingAction) =>
    run(action, () => api<OrgTastingDTO>(`${base}/status`, { body: { action } }));
  const wineAction = (tw: OrgTastingWineDTO, action: WineAction) =>
    run(`${tw.id}:${action}`, () => api<OrgTastingDTO>(`${base}/wines/${tw.id}/status`, { body: { action } }));

  const openCount = tasting.wines.filter((w) => w.status === "open").length;

  return (
    <div className="space-y-8">
      <Card className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl">
              {tasting.status === "draft"
                ? "Дегустация не запущена"
                : running
                  ? "Дегустация идёт"
                  : "Дегустация завершена"}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {plural(tasting.guestsCount, GUESTS)} · {plural(tasting.ratingsCount, RATINGS)}
              {running && ` · открыто вин: ${openCount}`}
            </p>
          </div>
          {tasting.status === "draft" && (
            <Button
              size="lg"
              onClick={() => setStatus("start")}
              loading={busy === "start"}
              disabled={busy !== null || tasting.wines.length === 0}
            >
              Запустить дегустацию
            </Button>
          )}
          {running && (
            <Button variant="danger" onClick={() => setConfirmClose(true)} disabled={busy !== null}>
              Завершить дегустацию
            </Button>
          )}
          {(tasting.status === "closed" || tasting.status === "published") && (
            <Button variant="secondary" onClick={onGoResults}>
              К итогам →
            </Button>
          )}
        </div>
        {tasting.status === "draft" && (
          <p className="text-sm text-ink-muted">
            {tasting.wines.length === 0
              ? "Добавьте в программу хотя бы одно вино — без него запустить нельзя."
              : "После запуска настройки и программа замораживаются. Вина открывайте по одному — гости увидят их в течение 5 секунд."}
          </p>
        )}
        {running && openCount === 0 && (
          <Alert tone="info">Откройте вино — гости смогут его оценить. Счётчики голосов обновляются сами.</Alert>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
      </Card>

      <section aria-labelledby="live-wines">
        <h2 id="live-wines" className="mb-3 text-xl">
          Вина
        </h2>
        <ol className="space-y-2">
          {tasting.wines.map((tw) => (
            <li key={tw.id}>
              <WineCard
                position={tw.position}
                label={tw.label}
                wine={tw.wine}
                highlighted={tw.status === "open"}
                badges={<Badge tone={WINE_TONE[tw.status]}>{WINE_STATUS_LABEL[tw.status]}</Badge>}
                actions={running && <WineActions tw={tw} busy={busy} onAction={(a) => wineAction(tw, a)} />}
              >
                {tasting.status !== "draft" && <VoteMeter votes={tw.ratingsCount} guests={tasting.guestsCount} />}
              </WineCard>
            </li>
          ))}
        </ol>
        {tasting.wines.length === 0 && (
          <Alert tone="info" className="mt-2">
            Программа пуста — добавьте вина на шаге «Программа».
          </Alert>
        )}
      </section>

      <section aria-labelledby="live-invite">
        <h2 id="live-invite" className="mb-3 text-xl">
          Приглашение
        </h2>
        <InvitePanel tasting={tasting} invite={invite} />
      </section>

      <ConfirmModal
        open={confirmClose}
        title="Завершить дегустацию?"
        confirmLabel="Завершить"
        variant="danger"
        loading={busy === "close"}
        onClose={() => setConfirmClose(false)}
        onConfirm={async () => {
          if (await setStatus("close")) {
            setConfirmClose(false);
            onGoResults();
          }
        }}
      >
        <p>Приём оценок прекратится, все открытые вина закроются. Вернуть дегустацию в работу будет нельзя.</p>
        <p className="text-ink-muted">Дальше — раскрытие бутылок, публикация итогов и передача в рейтинг.</p>
      </ConfirmModal>
    </div>
  );
}

function WineActions({
  tw,
  busy,
  onAction,
}: {
  tw: OrgTastingWineDTO;
  busy: string | null;
  onAction: (action: WineAction) => void;
}) {
  if (tw.status === "closed") return null;
  const disabled = busy !== null;
  return (
    <div className="flex flex-col gap-1 sm:flex-row">
      {tw.status === "pending" ? (
        <>
          <Button size="sm" onClick={() => onAction("open")} loading={busy === `${tw.id}:open`} disabled={disabled}>
            Открыть
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction("close")}
            loading={busy === `${tw.id}:close`}
            disabled={disabled}
            title="Закрыть без оценок — открыть его потом будет нельзя"
          >
            Пропустить
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onAction("close")}
          loading={busy === `${tw.id}:close`}
          disabled={disabled}
        >
          Закрыть
        </Button>
      )}
    </div>
  );
}

function VoteMeter({ votes, guests }: { votes: number; guests: number }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between gap-2 text-xs text-ink-muted">
        <span>{guests === 0 ? "Гостей пока нет" : `Проголосовали ${votes} из ${plural(guests, ["гостя", "гостей", "гостей"])}`}</span>
        {guests > 0 && <span>{Math.round((votes / guests) * 100)}%</span>}
      </div>
      <ProgressBar value={guests ? votes / guests : 0} label="Доля проголосовавших" />
    </div>
  );
}
