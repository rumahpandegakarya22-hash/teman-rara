import Skeleton from "@/components/ui/skeleton";

export default function LoadingRiwayat() {
  return (
    <main className="px-4 pt-4">
      <div className="safe-top" />
      <Skeleton className="mb-4 h-6 w-20" />
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </main>
  );
}
