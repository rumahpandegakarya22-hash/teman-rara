import { CheckCircle2, CircleDashed, Loader, XCircle } from "lucide-react";
import { normalisasiStatus, type StatusBaku } from "@/lib/kategori";

// Warna selalu berpasangan dengan ikon dan teks (color-independence, §10).
const TAMPILAN: Record<StatusBaku, { icon: typeof CheckCircle2; kelas: string }> = {
  Menunggu: { icon: CircleDashed, kelas: "bg-sunken text-fg-secondary" },
  Diproses: { icon: Loader, kelas: "bg-[#F5E7CC] text-warning" },
  Selesai: { icon: CheckCircle2, kelas: "bg-[#E6F0E6] text-success" },
  Dibatalkan: { icon: XCircle, kelas: "bg-sunken text-fg-secondary" },
};

/** `status` datang apa adanya dari tenant_complain, termasuk nilai lama "Review". */
export default function StatusPengaduan({ status }: { status: string }) {
  const baku = normalisasiStatus(status);
  const { icon: Icon, kelas } = TAMPILAN[baku];

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 t-label ${kelas}`}>
      <Icon size={14} aria-hidden />
      {baku}
    </span>
  );
}
