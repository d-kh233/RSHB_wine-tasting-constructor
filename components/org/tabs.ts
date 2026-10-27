// Вкладки кабинета — в обычном модуле: серверная страница разбирает ?tab=, а значения
// из "use client"-файла на сервере недоступны (там только ссылки на клиентские компоненты).

export const ORG_TABS = ["settings", "program", "live", "results"] as const;
export type OrgTab = (typeof ORG_TABS)[number];

/** Старые ссылки ?tab=invite ведут на «Проведение» — приглашение теперь там. */
export const parseOrgTab = (value: unknown): OrgTab =>
  value === "invite" ? "live" : ORG_TABS.includes(value as OrgTab) ? (value as OrgTab) : "settings";
