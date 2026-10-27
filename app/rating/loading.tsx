import { Skeleton } from "@/components/ui/Skeleton";
import { Container } from "@/components/ui/Container";

export default function RatingLoading() {
  return (
    <Container as="main" className="py-8 sm:py-12" aria-busy="true" aria-label="Загрузка рейтинга">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-6 h-10 w-3/4" />
      <Skeleton className="mt-3 h-5 w-2/3" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </Container>
  );
}
