"use client";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";

export default function RatingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container as="main" size="narrow" className="py-16">
      <EmptyState
        icon="⚠️"
        title="Не удалось загрузить рейтинг"
        text="Проверьте интернет и попробуйте ещё раз."
        action={<Button onClick={reset}>Повторить</Button>}
      />
    </Container>
  );
}
