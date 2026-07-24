import Link from "next/link";
import { ChevronRight, History } from "lucide-react";

/** Pintu masuk ke halaman Riwayat Pembayaran. */
export default function RiwayatPembayaranSoon() {
  return (
    <Link
      href="/kamar/riwayat"
      className="flex items-center gap-3 rounded-lg border border-line bg-raised p-5 elev-1"
    >
      <History size={20} className="shrink-0 text-action" aria-hidden />
      <span className="flex-1">
        <span className="t-h3 block">Riwayat Pembayaran</span>
        <span className="t-caption text-fg-secondary">Semua invoice sewa dan statusnya</span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-fg-secondary" aria-hidden />
    </Link>
  );
}
