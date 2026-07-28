import Skeleton from "@/components/ui/skeleton";

export default function LoadingKamar() {
  return (
    <main className="flex flex-col gap-6 px-4 pt-6">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-40" />
      </header>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-56 w-full rounded-lg" />
    </main>
  );
}
