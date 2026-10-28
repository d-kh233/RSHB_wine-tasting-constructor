"use client";

import type { OrgTastingDTO } from "@/lib/dto";
import type { InviteInfo } from "@/lib/qr";
import { Alert } from "../ui/Alert";
import { buttonClass } from "../ui/Button";
import { Card } from "../ui/Card";
import { CopyButton } from "../ui/CopyButton";
import { Input } from "../ui/Field";

const STATUS_HINT: Record<OrgTastingDTO["status"], string> = {
  draft: "Гости могут войти заранее. Оценивать смогут, когда вы запустите дегустацию и откроете вино.",
  running: "Дегустация идёт — гости, вошедшие по QR, сразу видят открытые вина.",
  closed: "Приём оценок завершён. Новые гости увидят только программу.",
  published: "Итоги опубликованы — вход для новых гостей закрыт.",
};

/** Приглашение гостей одной колонкой: QR, код, ссылка. Стоит слева на вкладке «Проведение». */
export function InvitePanel({ tasting, invite }: { tasting: OrgTastingDTO; invite: InviteInfo }) {
  return (
    <Card className="space-y-5">
      <h2 id="live-invite" className="text-xl">
        Приглашение гостей
      </h2>

      {!invite.url && (
        <Alert tone="warning">
          Не задан <code>NEXT_PUBLIC_BASE_URL</code> — QR-код не построен (в QR не должно попасть «localhost»). Укажите
          публичный адрес сайта в <code>.env</code> (для телефонов в той же Wi-Fi — IP ноутбука) и перезапустите сборку.
        </Alert>
      )}

      {invite.qrSvg && (
        <div className="flex flex-col items-center gap-3">
          {/* SVG собран на сервере библиотекой qrcode из нашего же URL. Белый фон нужен для сканера. */}
          <div
            className="w-full max-w-[280px] rounded-md bg-surface p-2 [&>svg]:h-auto [&>svg]:w-full"
            role="img"
            aria-label={`QR-код со ссылкой ${invite.url}`}
            dangerouslySetInnerHTML={{ __html: invite.qrSvg }}
          />
          <a
            href={`/org/${tasting.adminKey}/qr`}
            target="_blank"
            rel="noopener"
            className={buttonClass({ variant: "secondary", block: true })}
          >
            QR на весь экран
          </a>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-ink">Код дегустации</p>
        <p className="mt-1 font-serif text-4xl tracking-[0.2em] text-primary">{tasting.inviteCode}</p>
        <p className="mt-1 text-sm text-ink-muted">Можно продиктовать: гость введёт его на главной странице.</p>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Ссылка для гостей</p>
        <div className="flex flex-col gap-2">
          <Input
            readOnly
            value={invite.url ?? invite.path}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Ссылка для гостей"
            className="font-mono text-sm"
          />
          <CopyButton
            text={() => invite.url ?? `${window.location.origin}${invite.path}`}
            label="Копировать ссылку"
            className="shrink-0"
          />
        </div>
        <a
          href={invite.path}
          target="_blank"
          rel="noopener"
          className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Открыть страницу гостя ↗
        </a>
      </div>

      <p className="text-sm text-ink-muted">{STATUS_HINT[tasting.status]}</p>
    </Card>
  );
}
