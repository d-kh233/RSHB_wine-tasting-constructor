import { Skeleton } from "@/components/ui/Skeleton";

export default function RatingLoading() {
  return (
    <main className="mx-auto max-w-page px-4 py-10" aria-busy="true" aria-label="Загрузка рейтинга">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-6 h-10 w-3/4" />
      <Skeleton className="mt-3 h-5 w-2/3" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </main>
  );
}
