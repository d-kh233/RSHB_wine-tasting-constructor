import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionOrganizer } from "@/lib/session";
import { Card } from "../ui/Card";
import { Container } from "../ui/Container";
import { Logo } from "../ui/Logo";
import { AuthForm } from "./AuthForm";
import { DemoLoginButton } from "./DemoLoginButton";

/** Куда вернуться после входа: только локальный путь, иначе открытый редирект на чужой сайт. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

/** Общая страница /login и /register. Залогиненного сразу отправляем дальше. */
export async function AuthPage({ mode, next: rawNext }: { mode: "login" | "register"; next?: string }) {
  const next = safeNext(rawNext);
  if (await getSessionOrganizer()) redirect(next);

  return (
    <Container as="main" className="pb-16">
      <div className="py-4">
        <Logo href="/" />
      </div>
      <div className="mx-auto max-w-md pt-4">
        <Link href="/" className="text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          ← На главную
        </Link>
        <h1 className="mt-4 text-title">{mode === "login" ? "Вход для организатора" : "Регистрация организатора"}</h1>
        <p className="mt-2 text-ink-muted">
          Аккаунт хранит список ваших дегустаций. Гостям регистрация не нужна — они входят по QR.
        </p>
        <Card raised className="mt-6">
          <AuthForm mode={mode} next={next} />
        </Card>
        <div className="mt-6 flex items-center gap-3 text-sm text-ink-muted" aria-hidden>
          <span className="h-px flex-1 bg-line" />
          или
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="mt-6">
          <DemoLoginButton next={next} />
        </div>
      </div>
    </Container>
  );
}
