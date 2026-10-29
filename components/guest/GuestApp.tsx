"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/apiClient";
import { POLL_INTERVAL_MS, TASTING_MODE_LABEL } from "@/lib/constants";
import type { GuestRatingDTO, GuestTastingDTO, GuestTastingWineDTO } from "@/lib/dto";
import { SCALES } from "@/lib/scales";
import { Container } from "../ui/Container";
import { LocalDate } from "../ui/LocalDate";
import { JoinForm } from "./JoinForm";
import { OrganizerLine } from "./OrganizerLine";
import { RatingForm } from "./RatingForm";
import { RevealModal } from "./RevealResult";
import { TastingCard } from "./TastingCard";
import { ThankYou } from "./ThankYou";
import { ratableWines, WineList } from "./WineList";

/** Экран анкеты в адресе (?wine=… / ?thanks=…): кнопка «назад» на телефоне работает как ожидается. */
type Screen = { kind: "list" } | { kind: "rate"; id: string } | { kind: "thanks"; id: string; repeated: boolean };

function parseScreen(search: string): Screen {
  const params = new URLSearchParams(search);
  const rate = params.get("wine");
  if (rate) return { kind: "rate", id: rate };
  const thanks = params.get("thanks");
  if (thanks) return { kind: "thanks", id: thanks, repeated: false };
  return { kind: "list" };
}

function screenSearch(screen: Screen): string {
  if (screen.kind === "rate") return `?wine=${encodeURIComponent(screen.id)}`;
  if (screen.kind === "thanks") return `?thanks=${encodeURIComponent(screen.id)}`;
  return "";
}

export function GuestApp({ initial }: { initial: GuestTastingDTO }) {
  const [view, setView] = useState(initial);
  const [screen, setScreen] = useState<Screen>({ kind: "list" });
  const code = view.inviteCode;

  useEffect(() => {
    setScreen(parseScreen(window.location.search));
    const onPop = () => setScreen(parseScreen(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: Screen, { replace = false } = {}) => {
    const url = `${window.location.pathname}${screenSearch(next)}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    setScreen(next);
    window.scrollTo(0, 0);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await api<GuestTastingDTO>(`/api/t/${code}`);
      setView(next);
      return next;
    } catch {
      return null; // сеть моргнула — покажем свежие данные на следующем опросе
    }
  }, [code]);

  // Поллинг, пока что-то может измениться: организатор открывает и закрывает вина,
  // после завершения — раскрывает бутылки и публикует итоги.
  const live = view.me !== null && view.status !== "published";
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

  // Слепой режим: бутылки, раскрытые уже при открытой анкете, показываем окном «Вы поставили X, среднее Y».
  // Раскрытые до загрузки страницы видны в списке — окном не дёргаем.
  const seenRevealed = useRef(new Set(initial.wines.filter((w) => w.revealed).map((w) => w.id)));
  const [justRevealed, setJustRevealed] = useState<GuestTastingWineDTO[]>([]);
  useEffect(() => {
    if (view.mode !== "blind") return;
    const fresh = view.wines.filter((w) => w.revealed && !seenRevealed.current.has(w.id));
    if (fresh.length === 0) return;
    for (const w of fresh) seenRevealed.current.add(w.id);
    setJustRevealed((prev) => [...prev, ...fresh]);
  }, [view]);

  const onRated = (wineId: string) => (rating: GuestRatingDTO) => {
    setView((v) => ({ ...v, myRatings: [...v.myRatings.filter((r) => r.tastingWineId !== wineId), rating] }));
    navigate({ kind: "thanks", id: wineId, repeated: false }, { replace: true });
  };

  const onAlreadyRated = (wineId: string) => async () => {
    await refresh();
    navigate({ kind: "thanks", id: wineId, repeated: true }, { replace: true });
  };

  const toList = () => navigate({ kind: "list" });

  const screenWine = screen.kind !== "list" ? view.wines.find((w) => w.id === screen.id) : undefined;
  const myRating = screenWine ? view.myRatings.find((r) => r.tastingWineId === screenWine.id) : undefined;

  let content: ReactNode;
  if (!view.me) {
    content = <JoinForm view={view} onJoined={refresh} />;
  } else if (screen.kind === "rate" && screenWine && !myRating) {
    content = (
      <RatingForm
        key={screenWine.id}
        view={view}
        wine={screenWine}
        onBack={toList}
        onRated={onRated(screenWine.id)}
        onAlreadyRated={onAlreadyRated(screenWine.id)}
        onStale={refresh}
      />
    );
  } else if (screen.kind !== "list" && screenWine && myRating) {
    // Оценённое вино: и после отправки, и при повторном заходе на ?wine= — показываем сохранённую оценку.
    content = (
      <ThankYou
        view={view}
        wine={screenWine}
        rating={myRating}
        repeated={screen.kind === "thanks" ? screen.repeated : true}
        next={ratableWines(view)[0]}
        onNext={(id) => navigate({ kind: "rate", id }, { replace: true })}
        onList={toList}
      />
    );
  } else {
    content = <WineList view={view} onRate={(id) => navigate({ kind: "rate", id })} />;
  }

  const showHeader = !view.me || screen.kind === "list" || !screenWine;

  return (
    <Container as="main" size="narrow" className="min-h-dvh pb-10 pt-6">
      {showHeader &&
        (view.me ? (
          <header className="mb-6">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {TASTING_MODE_LABEL[view.mode]} дегустация · {SCALES[view.scale].label}
            </p>
            <h1 className="mt-1 break-words text-title">{view.title}</h1>
            {(view.startsAt || view.location) && (
              <p className="mt-1 text-sm text-ink-muted">
                {view.startsAt && <LocalDate iso={view.startsAt} />}
                {view.startsAt && view.location && " · "}
                {view.location}
              </p>
            )}
            <OrganizerLine organizer={view.organizer} className="mt-1" />
            {view.me.displayName && <p className="mt-2 text-sm text-ink-muted">Вы вошли как {view.me.displayName}</p>}
          </header>
        ) : (
          <TastingCard view={view} />
        ))}
      {content}
      {view.me && <RevealModal view={view} wines={justRevealed} onClose={() => setJustRevealed([])} />}
    </Container>
  );
}
