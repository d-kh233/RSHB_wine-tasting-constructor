"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { POLL_INTERVAL_MS, TASTING_MODE_LABEL, TASTING_STATUS_LABEL } from "@/lib/constants";
import type { OrgTastingDTO, WineDTO } from "@/lib/dto";
import type { InviteInfo } from "@/lib/qr";
import { SCALES } from "@/lib/scales";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { CopyButton } from "../ui/CopyButton";
import { LocalDate } from "../ui/LocalDate";
import { Stepper, type Step } from "../ui/Stepper";
import { LiveControl } from "./LiveControl";
import { STATUS_TONE, TastingSwitcher } from "./MyTastings";
import { ProgramEditor } from "./ProgramEditor";
import { ResultsPanel } from "./ResultsPanel";
import { SettingsForm } from "./SettingsForm";
import type { OrgTab } from "./tabs";

const STEPS: Step<OrgTab>[] = [
  { id: "settings", label: "Настройки" },
  { id: "program", label: "Программа" },
  { id: "live", label: "Проведение" },
  { id: "results", label: "Итоги" },
];

export function OrgCabinet({
  initial,
  invite,
  catalog,
  initialTab,
  justCreated,
  cabinetUrl,
  resultsUrl,
}: {
  initial: OrgTastingDTO;
  invite: InviteInfo;
  catalog: WineDTO[];
  initialTab: OrgTab;
  justCreated: boolean;
  /** Абсолютная ссылка на кабинет из NEXT_PUBLIC_BASE_URL; null — берём адрес из браузера. */
  cabinetUrl: string | null;
  /** Абсолютная ссылка на итоги для гостей; null — NEXT_PUBLIC_BASE_URL не задан. */
  resultsUrl: string | null;
}) {
  const [tasting, setTasting] = useState(initial);
  const [tab, setTab] = useState<OrgTab>(initialTab);

  const refresh = useCallback(async () => {
    try {
      setTasting(await api<OrgTastingDTO>(`/api/org/${tasting.adminKey}`));
    } catch {
      // сеть моргнула — обновим на следующем опросе
    }
  }, [tasting.adminKey]);

  // Счётчики гостей и голосов: опрос, пока дегустация идёт (и в черновике на «Проведении» — гости входят заранее).
  const live = tasting.status === "running" || (tasting.status === "draft" && tab === "live");
  useEffect(() => {
    if (!live) return;
    const tick = () => document.visibilityState === "visible" && refresh();
    const timer = window.setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [live, refresh]);

  // Вкладка — в URL (переживает перезагрузку); флаг ?created убираем, чтобы баннер не возвращался.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("created");
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
  }, [tab]);

  const copyCabinetLink = () => cabinetUrl ?? `${window.location.origin}${window.location.pathname}`;

  return (
    <div className="mx-auto max-w-page px-4 pb-16">
      <div className="flex items-center justify-between gap-2 py-3">
        <Link href="/" className="min-w-0 truncate font-serif text-base text-primary sm:text-lg">
          Конструктор дегустаций
        </Link>
        <TastingSwitcher
          current={{ adminKey: tasting.adminKey, title: tasting.title, status: tasting.status, isDemo: tasting.isDemo }}
        />
      </div>

      <header className="pt-2">
        <h1 className="break-words text-2xl sm:text-3xl">{tasting.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          <Badge tone={STATUS_TONE[tasting.status]}>{TASTING_STATUS_LABEL[tasting.status]}</Badge>
          <Badge tone={tasting.mode === "blind" ? "primary" : "neutral"}>{TASTING_MODE_LABEL[tasting.mode]}</Badge>
          <Badge>{SCALES[tasting.scale].label}</Badge>
          {tasting.isDemo && <Badge tone="accent">демо</Badge>}
          {tasting.startsAt && <LocalDate iso={tasting.startsAt} className="ml-1" />}
          {tasting.location && <span className="ml-1">{tasting.location}</span>}
        </div>

        {justCreated ? (
          <Alert tone="success" className="mt-4">
            <p className="font-medium">Дегустация создана.</p>
            <p className="mt-1">
              Сохраните ссылку на этот кабинет — авторизация организатора в планах, другого входа пока нет.
            </p>
            <CopyButton text={copyCabinetLink} label="Скопировать ссылку на кабинет" size="sm" className="mt-2" />
          </Alert>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span>Вход в кабинет — только по этой ссылке, сохраните её. Авторизация в планах.</span>
            <CopyButton text={copyCabinetLink} label="Копировать ссылку" variant="ghost" size="sm" />
          </div>
        )}
      </header>

      <div className="mt-6">
        <Stepper steps={STEPS} current={tab} onSelect={setTab} />
      </div>

      <div className="mt-6">
        {tab === "settings" && (
          <div className="max-w-2xl">
            <SettingsForm tasting={tasting} onSaved={setTasting} />
          </div>
        )}
        {tab === "program" && <ProgramEditor tasting={tasting} initialCatalog={catalog} onChange={setTasting} />}
        {tab === "live" && (
          <LiveControl tasting={tasting} invite={invite} onChange={setTasting} onGoResults={() => setTab("results")} />
        )}
        {tab === "results" && <ResultsPanel tasting={tasting} onChange={setTasting} resultsUrl={resultsUrl} />}
      </div>
    </div>
  );
}
