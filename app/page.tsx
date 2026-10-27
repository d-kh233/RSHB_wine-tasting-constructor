import Link from "next/link";
import { CodeEntry } from "@/components/guest/CodeEntry";
import { CreateTastingForm } from "@/components/org/CreateTastingForm";
import { MyTastingsList } from "@/components/org/MyTastings";
import { Card } from "@/components/ui/Card";
import { DEMO_ADMIN_KEY, DEMO_INVITE_CODE } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-page px-4 py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">Конструктор дегустаций</h1>
        <p className="mt-3 text-ink-muted">
          Соберите открытую или слепую дегустацию за пять минут: вина из каталога, понятная шкала, вход гостей по QR без
          регистрации. Гости оценивают с телефона, вы видите итоги.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card id="create" className="scroll-mt-6">
          <h2 className="text-xl">Новая дегустация</h2>
          <p className="mb-5 mt-1 text-sm text-ink-muted">Всё, кроме названия, можно поменять до запуска.</p>
          <CreateTastingForm />
        </Card>

        <aside className="space-y-8">
          <section aria-labelledby="guest-entry">
            <h2 id="guest-entry" className="text-xl">
              Я гость
            </h2>
            <p className="mb-3 mt-1 text-sm text-ink-muted">Отсканируйте QR у организатора или введите код.</p>
            <CodeEntry />
          </section>

          <MyTastingsList />

          <section aria-labelledby="demo">
            <h2 id="demo" className="text-xl">
              Демо
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <Link href={`/org/${DEMO_ADMIN_KEY}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  Кабинет организатора →
                </Link>
              </li>
              <li>
                <Link href={`/t/${DEMO_INVITE_CODE}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  Анкета гостя (код {DEMO_INVITE_CODE}) →
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
