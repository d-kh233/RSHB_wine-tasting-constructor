import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Забыли пароль" };

/** Заглушка: письма сервис пока не отправляет. */
export default function ForgotPasswordPage() {
  return (
    <Container as="main" className="pb-16">
      <div className="py-4">
        <Logo href="/" />
      </div>
      <div className="mx-auto max-w-md pt-4">
        <Link href="/login" className="text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          ← Ко входу
        </Link>
        <h1 className="mt-4 text-title">Забыли пароль</h1>
        <Card raised className="mt-6 space-y-4">
          <Alert tone="info">Восстановление пароля по почте — в планах. Сейчас сервис не отправляет письма.</Alert>
          <p className="text-sm text-ink-muted">
            Пока можно зарегистрироваться с другим email или посмотреть сервис через демо-аккаунт. Дегустации, созданные
            под старым аккаунтом, по-прежнему открываются секретной ссылкой на кабинет.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/login" className={buttonClass({ block: true })}>
              Ко входу
            </Link>
            <Link href="/register" className={buttonClass({ variant: "secondary", block: true })}>
              Регистрация
            </Link>
          </div>
        </Card>
      </div>
    </Container>
  );
}
