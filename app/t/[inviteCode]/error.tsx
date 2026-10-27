"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function GuestError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-form px-4 py-16">
      <EmptyState
        icon="⚠️"
        title="Не удалось загрузить дегустацию"
        text="Проверьте интернет и попробуйте ещё раз. Ваши оценки сохранены."
        action={<Button onClick={reset}>Повторить</Button>}
      />
    </main>
  );
}
