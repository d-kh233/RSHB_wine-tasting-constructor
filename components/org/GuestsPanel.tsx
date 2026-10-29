"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import { blindWineLabel } from "@/lib/constants";
import type { OrgGuestDTO, OrgTastingDTO } from "@/lib/dto";
import { plural } from "@/lib/plural";
import { formatScaleValue } from "@/lib/scales";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ConfirmModal } from "../ui/ConfirmModal";
import { useOrgAction } from "./useOrgAction";

const RATINGS: [string, string, string] = ["оценка", "оценки", "оценок"];

type Target =
  | { kind: "guest"; guest: OrgGuestDTO }
  | { kind: "rating"; guest: OrgGuestDTO; rating: OrgGuestDTO["ratings"][number] };

const guestName = (g: OrgGuestDTO, index: number) => g.displayName ?? `Гость без имени #${index + 1}`;

/**
 * Гости дегустации: имя и число оценок. Удалить можно гостя целиком (вместе с оценками) или одну оценку —
 * например, бота или случайный голос. После удаления счётчики в кабинете пересчитываются.
 */
export function GuestsPanel({ tasting, onChange }: { tasting: OrgTastingDTO; onChange: (t: OrgTastingDTO) => void }) {
  const base = `/api/org/${tasting.adminKey}`;
  const { busy, error, run } = useOrgAction(tasting.adminKey, onChange);
  const [guests, setGuests] = useState<OrgGuestDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null);

  const load = useCallback(async () => {
    try {
      setGuests(await api<OrgGuestDTO[]>(`${base}/guests`));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, [base]);

  // Кабинет опрашивает дегустацию; список перечитываем, когда меняются счётчики гостей или оценок.
  useEffect(() => {
    load();
  }, [load, tasting.guestsCount, tasting.ratingsCount]);

  const editable = tasting.status !== "published";

  async function confirmDelete() {
    if (!target) return;
    const ok =
      target.kind === "guest"
        ? await run(`guest:${target.guest.id}`, () =>
            api<OrgTastingDTO>(`${base}/guests/${target.guest.id}`, { method: "DELETE" }),
          )
        : await run(`rating:${target.rating.id}`, () =>
            api<OrgTastingDTO>(`${base}/ratings/${target.rating.id}`, { method: "DELETE" }),
          );
    setTarget(null);
    if (ok) load();
  }

  const index = (g: OrgGuestDTO) => guests?.indexOf(g) ?? 0;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">Гости</h2>
        {guests && <span className="text-sm text-ink-muted">{plural(guests.length, ["гость", "гостя", "гостей"])}</span>}
      </div>

      {loadError && (
        <Alert tone="danger">
          {loadError}{" "}
          <button type="button" onClick={load} className="font-medium underline">
            Повторить
          </button>
        </Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      {guests && guests.length === 0 && (
        <p className="text-sm text-ink-muted">Пока никто не вошёл. Гости появятся здесь, как только отсканируют QR.</p>
      )}

      {guests && guests.length > 0 && (
        <ul className="divide-y divide-line">
          {guests.map((g, i) => (
            <li key={g.id} className="py-2">
              <details>
                <summary className="flex min-h-11 cursor-pointer select-none items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-ink">{guestName(g, i)}</span>
                  <span className="shrink-0 text-sm text-ink-muted">{plural(g.ratings.length, RATINGS)}</span>
                </summary>
                <div className="mt-2 space-y-2 pb-1">
                  {g.ratings.length > 0 && (
                    <ul className="space-y-1">
                      {g.ratings.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                          <span>
                            {blindWineLabel(r.position)} — {formatScaleValue(tasting.scale, r.value)}
                          </span>
                          {editable && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setTarget({ kind: "rating", guest: g, rating: r })}
                              disabled={busy !== null}
                            >
                              Удалить оценку
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {editable && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setTarget({ kind: "guest", guest: g })}
                      disabled={busy !== null}
                    >
                      Удалить гостя
                    </Button>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      {!editable && <p className="text-xs text-ink-muted">Итоги опубликованы — гостей и оценки больше не удалить.</p>}

      <ConfirmModal
        open={target !== null}
        title={target?.kind === "guest" ? "Удалить гостя?" : "Удалить оценку?"}
        confirmLabel="Удалить"
        variant="danger"
        loading={busy !== null}
        onClose={() => setTarget(null)}
        onConfirm={confirmDelete}
      >
        {target?.kind === "guest" && (
          <p>
            «{guestName(target.guest, index(target.guest))}» и {plural(target.guest.ratings.length, RATINGS)} будут
            удалены. Вход по его ссылке перестанет работать.
          </p>
        )}
        {target?.kind === "rating" && (
          <p>
            Оценка {formatScaleValue(tasting.scale, target.rating.value)} за {blindWineLabel(target.rating.position)} от «
            {guestName(target.guest, index(target.guest))}» будет удалена. Пока вино открыто, гость сможет оценить его
            заново.
          </p>
        )}
        <p className="text-ink-muted">Отменить удаление нельзя. После передачи в рейтинг удаление недоступно.</p>
      </ConfirmModal>
    </Card>
  );
}
