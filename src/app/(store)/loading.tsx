import { CardGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <Skeleton className="h-10 w-72" />
      <div className="flex gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-24 shrink-0" />)}</div>
      <CardGridSkeleton />
    </div>
  );
}
