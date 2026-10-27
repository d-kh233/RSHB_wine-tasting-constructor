import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";

export default function OrgNotFound() {
  return (
    <Container as="main" size="narrow" className="py-16">
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
    </Container>
  );
}
