import Skeleton from "@/components/ui/skeleton";

export default function LoadingPengaduan() {
  return (
    <main className="px-4 pt-6">
      <header className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </header>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </main>
  );
}
