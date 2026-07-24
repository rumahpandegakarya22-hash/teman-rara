import { Hammer } from "lucide-react";
import EmptyState from "@/components/empty-state";

export default function SegeraHadir({ judul, fase }: { judul: string; fase: string }) {
  return (
    <main className="px-4 pt-6">
      <h1 className="t-h1 mb-6">{judul}</h1>
      <EmptyState
        icon={Hammer}
        title="Segera hadir"
        description={`Fitur ini dikerjakan pada ${fase}. Sementara ini, hubungi pengelola seperti biasa.`}
      />
    </main>
  );
}
