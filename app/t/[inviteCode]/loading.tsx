import { Skeleton } from "@/components/ui/Skeleton";
import { Container } from "@/components/ui/Container";

export default function GuestLoading() {
  return (
    <Container as="main" size="narrow" className="pt-6" aria-busy="true" aria-label="Загрузка дегустации">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-3 h-8 w-4/5" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </Container>
  );
}
