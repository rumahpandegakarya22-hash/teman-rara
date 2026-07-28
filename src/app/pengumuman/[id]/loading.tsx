import Skeleton from "@/components/ui/skeleton";

export default function LoadingPengumuman() {
  return (
    <main className="px-4 pt-4">
      <div className="safe-top" />
      <Skeleton className="mb-4 h-6 w-32" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="mt-6 h-40 w-full rounded-lg" />
    </main>
  );
}
