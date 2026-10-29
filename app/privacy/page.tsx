import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Политика конфиденциальности" };

/** Страница-заглушка для MVP: кратко и честно, что хранит сервис. Полная редакция — в планах. */
export default function PrivacyPage() {
  return (
    <Container as="main" className="pb-16">
      <div className="py-4">
        <Logo href="/" />
      </div>
      <div className="mx-auto max-w-2xl pt-4">
        <Link href="/" className="text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          ← На главную
        </Link>
        <h1 className="mt-4 text-title">Политика конфиденциальности</h1>
        <p className="mt-2 text-ink-muted">
          Краткая версия для MVP. Полная редакция политики и порядок обработки персональных данных — в планах.
        </p>
        <Card raised className="mt-6 space-y-5 text-sm leading-relaxed text-ink">
          <section>
            <h2 className="text-lg">Организаторы</h2>
            <p className="mt-1">
              При регистрации мы храним email, пароль (только в виде необратимого хэша), имя для гостей и по желанию
              организацию, город и короткое описание, а также дату вашего согласия на обработку данных. Имя, организацию
              и город видят гости ваших дегустаций («Организатор: …»); email и пароль никому не показываются. Полное ФИО не
              запрашивается.
            </p>
          </section>
          <section>
            <h2 className="text-lg">Гости</h2>
            <p className="mt-1">
              Гостю не нужна регистрация. Имя можно не вводить: оценки анонимны. Если имя указано, его видит только
              организатор дегустации. В «Народный винный рейтинг» оценки передаются без имён и заметок — только с
              анонимным хэшем гостя.
            </p>
          </section>
          <section>
            <h2 className="text-lg">Cookie</h2>
            <p className="mt-1">
              Мы используем технические cookie: вход организатора и «запоминание» гостя в дегустации на этом телефоне.
              Рекламы и сторонней аналитики нет.
            </p>
          </section>
          <section>
            <h2 className="text-lg">Удаление данных</h2>
            <p className="mt-1">
              Организатор может удалить дегустацию вместе с гостями и оценками. Оценки, уже переданные в рейтинг, остаются
              в нём без связи с дегустацией и с людьми.
            </p>
          </section>
        </Card>
      </div>
    </Container>
  );
}
