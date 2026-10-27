import { Skeleton } from "@/components/ui/Skeleton";

export default function GuestLoading() {
  return (
    <main className="mx-auto max-w-form px-4 pt-5" aria-busy="true" aria-label="Загрузка дегустации">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-3 h-8 w-4/5" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </main>
  );
}
