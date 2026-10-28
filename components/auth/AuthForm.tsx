"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import { EMAIL_MAX, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/constants";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";

type Mode = "login" | "register";

const TEXT: Record<Mode, { submit: string; switchText: string; switchLink: string; switchHref: string }> = {
  login: { submit: "Войти", switchText: "Нет аккаунта?", switchLink: "Зарегистрироваться", switchHref: "/register" },
  register: { submit: "Зарегистрироваться", switchText: "Уже есть аккаунт?", switchLink: "Войти", switchHref: "/login" },
};

/** next — куда вернуться после входа; уже проверен на сервере (только локальный путь). */
export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = TEXT[mode];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api(`/api/auth/${mode}`, { body: { email, password } });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  const switchHref = next === "/" ? text.switchHref : `${text.switchHref}?next=${encodeURIComponent(next)}`;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={EMAIL_MAX}
          autoComplete="email"
          required
          disabled={submitting}
        />
      </Field>
      <Field label="Пароль" hint={mode === "register" ? `От ${PASSWORD_MIN} символов` : undefined}>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={mode === "register" ? PASSWORD_MIN : undefined}
          maxLength={mode === "register" ? PASSWORD_MAX : undefined}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          required
          disabled={submitting}
        />
      </Field>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" size="lg" block loading={submitting}>
        {text.submit}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        {text.switchText}{" "}
        <Link href={switchHref} className="font-medium text-primary underline-offset-4 hover:underline">
          {text.switchLink}
        </Link>
      </p>
    </form>
  );
}
