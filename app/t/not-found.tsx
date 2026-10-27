import { CodeEntry } from "@/components/guest/CodeEntry";
import { Container } from "@/components/ui/Container";

export default function GuestNotFound() {
  return (
    <Container as="main" size="narrow" className="py-12">
      <div className="text-center">
        <div className="text-4xl" aria-hidden>
          🍷
        </div>
        <h1 className="mt-4 text-title">Код не найден</h1>
        <p className="mt-2 text-ink-muted">
          Проверьте код дегустации — его показывает организатор рядом с QR. Буквы O и I в кодах не используются.
        </p>
      </div>
      <div className="mt-6">
        <CodeEntry />
      </div>
    </Container>
  );
}
