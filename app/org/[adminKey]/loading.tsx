import { Skeleton } from "@/components/ui/Skeleton";

export default function OrgLoading() {
  return (
    <div className="mx-auto max-w-page px-4 py-6" aria-busy="true" aria-label="Загрузка кабинета">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-6 h-9 w-3/4" />
      <Skeleton className="mt-3 h-5 w-64" />
      <Skeleton className="mt-8 h-12 w-full" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
