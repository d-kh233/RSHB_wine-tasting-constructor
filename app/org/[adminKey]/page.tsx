import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrgCabinet } from "@/components/org/OrgCabinet";
import { parseOrgTab, type OrgTab } from "@/components/org/tabs";
import type { TastingStatus } from "@/lib/constants";
import { buildInvite, getBaseUrl } from "@/lib/qr";
import * as tastingService from "@/services/tastingService";
import * as wineService from "@/services/wineService";

type Props = {
  params: Promise<{ adminKey: string }>;
  searchParams: Promise<{ tab?: string; created?: string }>;
};

// Секретная ссылка: не индексируем и не отдаём Referer наружу.
export const metadata: Metadata = {
  title: "Кабинет организатора",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const TAB_BY_STATUS: Record<TastingStatus, OrgTab> = {
  draft: "settings",
  running: "live",
  closed: "results",
  published: "results",
};

export default async function OrgPage({ params, searchParams }: Props) {
  const [{ adminKey }, query] = await Promise.all([params, searchParams]);
  const tasting = await tastingService.findOrgTasting(adminKey);
  if (!tasting) notFound();

  const [invite, catalog] = await Promise.all([buildInvite(tasting.inviteCode), wineService.search("")]);
  const justCreated = query.created === "1";
  const base = getBaseUrl();

  return (
    <OrgCabinet
      initial={tasting}
      invite={invite}
      catalog={catalog}
      // Сразу после создания настройки уже заполнены — ведём к программе; дальше — к текущему этапу.
      initialTab={query.tab ? parseOrgTab(query.tab) : justCreated ? "program" : TAB_BY_STATUS[tasting.status]}
      justCreated={justCreated}
      cabinetUrl={base ? `${base}/org/${tasting.adminKey}` : null}
      resultsUrl={base ? `${base}/t/${tasting.inviteCode}/results` : null}
    />
  );
}
