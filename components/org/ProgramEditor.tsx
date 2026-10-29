"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/apiClient";
import type { OrgTastingDTO, WineDTO } from "@/lib/dto";
import { plural } from "@/lib/plural";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { cx } from "../ui/cx";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { WineCard } from "../ui/WineCard";
import { WineForm } from "./WineForm";
import { WinePhotoControl } from "./WinePhotoControl";

const SEARCH_DEBOUNCE_MS = 250;

export function ProgramEditor({
  tasting,
  initialCatalog,
  onChange,
}: {
  tasting: OrgTastingDTO;
  initialCatalog: WineDTO[];
  onChange: (t: OrgTastingDTO) => void;
}) {
  const editable = tasting.status === "draft";
  const base = `/api/org/${tasting.adminKey}`;

  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  /** Любое изменение программы: блокируем кнопки на время запроса, сервер возвращает свежий DTO. */
  async function mutate(request: () => Promise<OrgTastingDTO>): Promise<boolean> {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      onChange(await request());
      return true;
    } catch (err) {
      setError(errorMessage(err));
      // Конфликт состояния (программу поменяли в другой вкладке и т.п.) — подтягиваем актуальную.
      if (err instanceof ApiError && err.status === 409) {
        api<OrgTastingDTO>(base).then(onChange, () => {});
      }
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const addWine = (wineId: string) => mutate(() => api(`${base}/wines`, { body: { wineId } }));
  const removeWine = (twId: string) => mutate(() => api(`${base}/wines/${twId}`, { method: "DELETE" }));
  const move = (index: number, delta: -1 | 1) => {
    const ids = tasting.wines.map((w) => w.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    return mutate(() => api(`${base}/wines/order`, { body: { orderedIds: ids } }));
  };

  const inProgram = new Set(tasting.wines.map((w) => w.wine.id));

  // Фото живёт в каталоге: после загрузки обновляем и карточку в каталоге, и программу.
  const [savedWine, setSavedWine] = useState<WineDTO | null>(null);
  const onWineSaved = (wine: WineDTO) => {
    setSavedWine(wine);
    api<OrgTastingDTO>(base).then(onChange, () => {});
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section aria-labelledby="program-title" className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="program-title" className="text-xl">
            Программа
          </h2>
          <span className="text-sm text-ink-muted">{plural(tasting.wines.length, ["вино", "вина", "вин"])}</span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {tasting.mode === "blind"
            ? "Слепой режим: гости увидят только «Вино №N». Номер — это позиция в программе."
            : "Гости увидят вина в этом порядке."}
        </p>

        {!editable && (
          <Alert tone="info" className="mt-3">
            Дегустация уже запущена — программа заморожена.{!tasting.isDemo && " Фото бутылок менять можно."}
          </Alert>
        )}
        {tasting.isDemo && (
          <p className="mt-3 text-sm text-ink-muted">
            В демо-кабинете фото каталога менять нельзя — его ссылка открыта всем. Создайте свою дегустацию.
          </p>
        )}
        {error && (
          <Alert tone="danger" className="mt-3">
            {error}
          </Alert>
        )}

        <ol className="mt-4 space-y-2">
          {tasting.wines.map((tw, i) => (
            <li key={tw.id}>
              <WineCard
                position={tw.position}
                label={tw.label}
                wine={tw.wine}
                art={{ imageUrl: tw.wine.imageUrl }}
                actions={
                  editable && (
                    <>
                      <IconButton label="Выше" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                        ↑
                      </IconButton>
                      <IconButton
                        label="Ниже"
                        disabled={busy || i === tasting.wines.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        ↓
                      </IconButton>
                      <IconButton label={`Убрать ${tw.label}`} disabled={busy} onClick={() => removeWine(tw.id)} danger>
                        ×
                      </IconButton>
                    </>
                  )
                }
              >
                {!tasting.isDemo && (
                  <WinePhotoControl
                    adminKey={tasting.adminKey}
                    wine={tw.wine}
                    onSaved={onWineSaved}
                    hint={
                      tasting.mode === "blind" && tw.wine.imageUrl && !tw.revealed
                        ? "Гости увидят фото только после раскрытия бутылки."
                        : null
                    }
                  />
                )}
              </WineCard>
            </li>
          ))}
        </ol>
        {tasting.wines.length === 0 && (
          <EmptyState
            icon="🍷"
            title="Добавьте первое вино"
            text="Найдите его в каталоге справа (на телефоне — ниже) или добавьте своё."
            className="mt-4"
          />
        )}
      </section>

      <CatalogPanel
        initial={initialCatalog}
        inProgram={inProgram}
        editable={editable}
        busy={busy}
        adminKey={tasting.isDemo ? null : tasting.adminKey}
        savedWine={savedWine}
        onWineSaved={onWineSaved}
        onAdd={addWine}
        onCreateClick={() => {
          setError(null);
          setModalOpen(true);
        }}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Своё вино">
        <WineForm
          onCreated={async (wine) => {
            if (await addWine(wine.id)) setModalOpen(false);
          }}
          onCancel={() => setModalOpen(false)}
          submitLabel="Добавить в программу"
          extraError={error}
        />
      </Modal>
    </div>
  );
}

function CatalogPanel({
  initial,
  inProgram,
  editable,
  busy,
  adminKey,
  savedWine,
  onWineSaved,
  onAdd,
  onCreateClick,
}: {
  initial: WineDTO[];
  inProgram: Set<string>;
  editable: boolean;
  busy: boolean;
  /** null — фото каталога менять нельзя (демо-кабинет). */
  adminKey: string | null;
  /** Последнее вино с новым фото — подменяем его в результатах поиска. */
  savedWine: WineDTO | null;
  onWineSaved: (wine: WineDTO) => void;
  onAdd: (wineId: string) => void;
  onCreateClick: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initial);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (savedWine) setResults((list) => list.map((w) => (w.id === savedWine.id ? savedWine : w)));
  }, [savedWine]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false; // начальный список уже пришёл с сервера
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const found = await api<WineDTO[]>(`/api/wines?q=${encodeURIComponent(query.trim())}`);
        if (!cancelled) {
          setResults(found);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <section aria-labelledby="catalog-title" className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h2 id="catalog-title" className="text-xl">
          Каталог
        </h2>
        {editable && (
          <Button variant="secondary" size="sm" onClick={onCreateClick}>
            + Своё вино
          </Button>
        )}
      </div>
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Название, производитель, регион, сорт…"
        aria-label="Поиск по каталогу"
        className="mt-3"
      />
      {error && (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      )}
      <ul className={cx("mt-3 space-y-2 transition-opacity", searching && "opacity-60")} aria-busy={searching}>
        {results.map((wine) => {
          const added = inProgram.has(wine.id);
          return (
            <li key={wine.id}>
              <WineCard
                wine={wine}
                art={{ imageUrl: wine.imageUrl }}
                badges={wine.isDemo && <Badge tone="accent">демо</Badge>}
                actions={
                  added ? (
                    <Badge tone="success">✓ в программе</Badge>
                  ) : (
                    editable && (
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAdd(wine.id)}>
                        Добавить
                      </Button>
                    )
                  )
                }
              >
                {adminKey && <WinePhotoControl adminKey={adminKey} wine={wine} onSaved={onWineSaved} />}
              </WineCard>
            </li>
          );
        })}
      </ul>
      {results.length === 0 && !searching && (
        <EmptyState
          title={query ? "Ничего не нашлось" : "Каталог пуст"}
          text={editable ? "Добавьте вино вручную — оно появится в каталоге." : undefined}
          action={
            editable && (
              <Button variant="secondary" size="sm" onClick={onCreateClick}>
                + Своё вино
              </Button>
            )
          }
          className="mt-3"
        />
      )}
    </section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex h-9 w-9 items-center justify-center rounded-md text-lg transition-colors disabled:opacity-30",
        danger ? "text-danger hover:bg-danger-soft" : "text-ink-muted hover:bg-surface-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
