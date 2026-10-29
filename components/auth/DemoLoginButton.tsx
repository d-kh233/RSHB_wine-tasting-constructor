"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/apiClient";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";

/** Вход в общий демо-аккаунт без регистрации и пароля. next — куда перейти после входа. */
export function DemoLoginButton({ next }: { next: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/demo", { method: "POST" });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="secondary" size="lg" block loading={pending} onClick={login}>
        Войти как демо-организатор
      </Button>
      <p className="text-center text-xs text-ink-muted">
        Без регистрации: откроется общий демо-аккаунт с готовой дегустацией. Данные в нём видят все, кто зашёл так же.
      </p>
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
