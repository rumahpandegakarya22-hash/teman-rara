import Skeleton from "@/components/ui/skeleton";

export default function LoadingDetailPengaduan() {
  return (
    <main className="px-4 pt-4">
      <div className="safe-top" />
      <Skeleton className="mb-4 h-6 w-24" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="mt-4 h-32 w-full rounded-lg" />
    </main>
  );
}
