"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/apiClient";
import { cx } from "../ui/cx";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // Даже при сетевой ошибке перечитываем страницу: она покажет, вышли мы или нет.
    }
    router.refresh();
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className={cx("font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-60", className)}
    >
      Выйти
    </button>
  );
}
