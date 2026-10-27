// Вкладки кабинета — в обычном модуле: серверная страница разбирает ?tab=, а значения
// из "use client"-файла на сервере недоступны (там только ссылки на клиентские компоненты).

export const ORG_TABS = ["settings", "program", "invite"] as const;
export type OrgTab = (typeof ORG_TABS)[number];

export const parseOrgTab = (value: unknown): OrgTab =>
  ORG_TABS.includes(value as OrgTab) ? (value as OrgTab) : "settings";
