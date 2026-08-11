const GAYA: Record<string, string> = {
  Menunggu: "bg-amber-100 text-amber-700",
  Disetujui: "bg-emerald-100 text-emerald-700",
  Selesai: "bg-emerald-100 text-emerald-700",
  Ditolak: "bg-red-100 text-red-600",
  Dibatalkan: "bg-sunken text-fg-secondary",
};

export default function StatusPengajuanBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 t-caption font-medium ${GAYA[status] ?? "bg-sunken text-fg-secondary"}`}>
      {status}
    </span>
  );
}
