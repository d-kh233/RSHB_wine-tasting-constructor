"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { POLL_INTERVAL_MS, TASTING_MODE_LABEL, TASTING_STATUS_LABEL } from "@/lib/constants";
import type { MyTastingDTO, OrgTastingDTO, WineDTO } from "@/lib/dto";
import type { InviteInfo } from "@/lib/qr";
import { SCALES } from "@/lib/scales";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Container } from "../ui/Container";
import { CopyButton } from "../ui/CopyButton";
import { LocalDate } from "../ui/LocalDate";
import { Logo } from "../ui/Logo";
import { Stepper, type Step } from "../ui/Stepper";
import { DeleteTastingButton } from "./DeleteTastingButton";
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
  myTastings,
  owned,
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
  /** Дегустации аккаунта; null — организатор не вошёл. */
  myTastings: MyTastingDTO[] | null;
  /** Дегустация принадлежит вошедшему организатору. */
  owned: boolean;
}) {
  const router = useRouter();
  const [tasting, setTasting] = useState(initial);
  const [tab, setTab] = useState<OrgTab>(initialTab);
  const demoOwner = myTastings?.find((t) => t.adminKey === initial.adminKey)?.demoOwner ?? false;

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
    <Container className="pb-16">
      <div className="flex items-center justify-between gap-2 py-4">
        <Logo href="/" />
        <TastingSwitcher
          current={{ adminKey: tasting.adminKey, title: tasting.title, status: tasting.status, isDemo: tasting.isDemo, demoOwner }}
          entries={myTastings}
        />
      </div>

      <header className="pt-4">
        <h1 className="break-words text-title">{tasting.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          <Badge tone={STATUS_TONE[tasting.status]}>{TASTING_STATUS_LABEL[tasting.status]}</Badge>
          <Badge tone={tasting.mode === "blind" ? "primary" : "neutral"}>{TASTING_MODE_LABEL[tasting.mode]}</Badge>
          <Badge>{SCALES[tasting.scale].label}</Badge>
          {(tasting.isDemo || demoOwner) && <Badge tone="accent">демо</Badge>}
          {tasting.startsAt && <LocalDate iso={tasting.startsAt} className="ml-1" />}
          {tasting.location && <span className="ml-1">{tasting.location}</span>}
        </div>

        {justCreated ? (
          <Alert tone="success" className="mt-4">
            <p className="font-medium">Дегустация создана.</p>
            <p className="mt-1">
              {owned ? (
                "Она сохранена в «Моих дегустациях». Ссылка на кабинет — резервный вход без пароля, не показывайте её гостям."
              ) : (
                <>
                  Вы не вошли в аккаунт, поэтому попасть в кабинет можно только по этой ссылке — сохраните её.{" "}
                  <Link href="/register" className="font-medium underline underline-offset-4">
                    Зарегистрируйтесь
                  </Link>
                  , чтобы следующие дегустации хранились в аккаунте.
                </>
              )}
            </p>
            <CopyButton text={copyCabinetLink} label="Скопировать ссылку на кабинет" size="sm" className="mt-2" />
          </Alert>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span>
              {owned
                ? "Дегустация в вашем аккаунте. Секретная ссылка — резервный вход без пароля."
                : "Ссылка открывает кабинет без пароля — сохраните её и не показывайте гостям."}
            </span>
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
            {!tasting.isDemo && (
              <section aria-labelledby="danger-zone" className="mt-10 border-t border-line pt-6">
                <h2 id="danger-zone" className="text-xl">
                  Удаление
                </h2>
                <p className="mb-3 mt-1 text-sm text-ink-muted">
                  Дегустация удалится вместе с программой, гостями и оценками. Вина останутся в каталоге.
                </p>
                <DeleteTastingButton
                  adminKey={tasting.adminKey}
                  title={tasting.title}
                  onDeleted={() => {
                    router.replace("/");
                    router.refresh();
                  }}
                />
              </section>
            )}
          </div>
        )}
        {tab === "program" && <ProgramEditor tasting={tasting} initialCatalog={catalog} onChange={setTasting} />}
        {tab === "live" && (
          <LiveControl tasting={tasting} invite={invite} onChange={setTasting} onGoResults={() => setTab("results")} />
        )}
        {tab === "results" && <ResultsPanel tasting={tasting} onChange={setTasting} resultsUrl={resultsUrl} />}
      </div>
    </Container>
  );
}
