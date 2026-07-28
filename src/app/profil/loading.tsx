import Skeleton from "@/components/ui/skeleton";

export default function LoadingProfil() {
  return (
    <main className="flex flex-col gap-8 px-4 pt-6">
      <header className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </header>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </main>
  );
}
