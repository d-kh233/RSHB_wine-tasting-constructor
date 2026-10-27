import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function OrgNotFound() {
  return (
    <main className="mx-auto max-w-form px-4 py-16">
      <EmptyState
        icon="🔒"
        title="Ссылка недействительна"
        text="Кабинет с таким ключом не найден. Проверьте ссылку целиком — ключ длинный, его легко обрезать при копировании."
        action={
          <Link href="/" className={buttonClass()}>
            На главную
          </Link>
        }
      />
    </main>
  );
}
