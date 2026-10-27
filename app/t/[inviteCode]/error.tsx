"use client";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";

export default function GuestError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container as="main" size="narrow" className="py-16">
      <EmptyState
        icon="⚠️"
        title="Не удалось загрузить дегустацию"
        text="Проверьте интернет и попробуйте ещё раз. Ваши оценки сохранены."
        action={<Button onClick={reset}>Повторить</Button>}
      />
    </Container>
  );
}
