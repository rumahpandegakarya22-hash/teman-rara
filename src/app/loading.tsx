import Skeleton from "@/components/ui/skeleton";

export default function LoadingBeranda() {
  return (
    <main className="px-4 pt-4">
      <div className="mb-2 flex justify-end">
        <Skeleton className="h-6 w-16" />
      </div>
      <header className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </header>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </main>
  );
}
