"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function OrgError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-form px-4 py-16">
      <EmptyState
        icon="⚠️"
        title="Не удалось открыть кабинет"
        text="Похоже на временную ошибку сервера. Попробуйте ещё раз."
        action={<Button onClick={reset}>Повторить</Button>}
      />
    </main>
  );
}
