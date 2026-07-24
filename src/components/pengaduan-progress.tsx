import Link from "next/link";
import { ChevronRight, MessageSquareWarning } from "lucide-react";
import StatusPengaduan from "@/components/status-pengaduan";
import { formatTanggal } from "@/lib/format";

/** Ringkasan pengaduan terbaru penghuni, tampil di beranda khusus sesi login. */
export default function PengaduanProgress({
  aduan,
}: {
  aduan: { id_complain: string; title: string; status: string; reported_at: string | null };
}) {
  return (
    <section aria-labelledby="judul-progress" className="mb-8">
      <h2 id="judul-progress" className="t-h3 mb-3 flex items-center gap-2">
        <MessageSquareWarning size={20} className="text-action" aria-hidden />
        Pengaduan Terakhir
      </h2>
      <Link
        href={`/pengaduan/${aduan.id_complain}`}
        className="flex items-center gap-3 rounded-lg border border-line bg-raised p-5 elev-1"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="t-body truncate font-medium">{aduan.title}</h3>
            <StatusPengaduan status={aduan.status} />
          </div>
          {aduan.reported_at && (
            <p className="t-caption mt-1 text-fg-secondary">Diajukan {formatTanggal(aduan.reported_at)}</p>
          )}
        </div>
        <ChevronRight size={20} className="shrink-0 text-fg-secondary" aria-hidden />
      </Link>
    </section>
  );
}
