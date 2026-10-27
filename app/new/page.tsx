import type { Metadata } from "next";
import Link from "next/link";
import { CreateTastingForm } from "@/components/org/CreateTastingForm";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Новая дегустация" };

export default function NewTastingPage() {
  return (
    <Container as="main" className="pb-16">
      <div className="py-4">
        <Logo href="/" />
      </div>
      <div className="mx-auto max-w-2xl pt-4">
        <Link href="/" className="text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          ← На главную
        </Link>
        <h1 className="mt-4 text-title">Новая дегустация</h1>
        <p className="mt-2 text-ink-muted">Всё, кроме названия, можно поменять до запуска.</p>
        <Card raised className="mt-6">
          <CreateTastingForm />
        </Card>
      </div>
    </Container>
  );
}
