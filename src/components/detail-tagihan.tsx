import { CalendarClock, CheckCircle2, CircleAlert, CircleDashed, CircleDollarSign } from "lucide-react";
import { formatRupiah, formatTanggal } from "@/lib/format";

type Status = "lunas" | "sebagian" | "nunggak" | "belum";

const TAMPILAN: Record<Status, { label: string; icon: typeof CheckCircle2; kelas: string }> = {
  lunas: { label: "Lunas", icon: CheckCircle2, kelas: "bg-[#E6F0E6] text-success" },
  sebagian: { label: "Bayar Sebagian", icon: CircleDollarSign, kelas: "bg-[#F5E7CC] text-warning" },
  nunggak: { label: "Nunggak", icon: CircleAlert, kelas: "bg-red-100 text-red-600" },
  belum: { label: "Belum Lunas", icon: CircleDashed, kelas: "bg-sunken text-fg-secondary" },
};

type Tagihan = {
  status: Status;
  no_inv: string;
  periode_awal: string | null;
  periode_akhir: string | null;
  tanggal_pembayaran: string | null;
  harga_sewa: number | null;
  tambahan_listrik: number | null;
  total_sewa: number | null;
  total_listrik: number | null;
  subtotal: number | null;
  diskon: number | null;
  pajak: number | null;
  grand_total: number | null;
  jumlah_bulan: number | null;
  sisa: number;
};

function Baris({ label, nilai, tebal }: { label: string; nilai: string; tebal?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`t-body-sm ${tebal ? "font-semibold" : "text-fg-secondary"}`}>{label}</span>
      <span className={`t-body-sm tabular-nums ${tebal ? "font-semibold" : ""}`}>{nilai}</span>
    </div>
  );
}

export default function DetailTagihan({ tagihan }: { tagihan: Tagihan }) {
  const { label, icon: Icon, kelas } = TAMPILAN[tagihan.status];
  const bulan = tagihan.jumlah_bulan ?? 1;

  return (
    <section className="rounded-lg border border-line bg-raised p-5 elev-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-overline truncate text-fg-secondary">{tagihan.no_inv}</p>
          <p className="t-h2 mt-1 tabular-nums">{formatRupiah(tagihan.grand_total ?? 0)}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 t-label ${kelas}`}>
          <Icon size={16} aria-hidden />
          {label}
        </span>
      </div>

      {tagihan.periode_awal && tagihan.periode_akhir && (
        <p className="t-caption mt-2 text-fg-secondary">
          Periode {formatTanggal(tagihan.periode_awal)} sampai {formatTanggal(tagihan.periode_akhir)}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
        <Baris
          label={`Sewa ${bulan} bulan${tagihan.harga_sewa ? ` (${formatRupiah(tagihan.harga_sewa)}/bln)` : ""}`}
          nilai={formatRupiah(tagihan.total_sewa ?? 0)}
        />
        {(tagihan.total_listrik ?? 0) > 0 && (
          <Baris
            label={`Listrik tambahan${tagihan.tambahan_listrik ? ` (${formatRupiah(tagihan.tambahan_listrik)}/bln)` : ""}`}
            nilai={formatRupiah(tagihan.total_listrik ?? 0)}
          />
        )}
        {tagihan.subtotal != null && <Baris label="Subtotal" nilai={formatRupiah(tagihan.subtotal)} />}
        {(tagihan.diskon ?? 0) > 0 && (
          <Baris label="Diskon" nilai={`- ${formatRupiah(tagihan.diskon ?? 0)}`} />
        )}
        {(tagihan.pajak ?? 0) > 0 && <Baris label="Pajak" nilai={formatRupiah(tagihan.pajak ?? 0)} />}
        <div className="mt-1 border-t border-line pt-2">
          <Baris label="Total tagihan" nilai={formatRupiah(tagihan.grand_total ?? 0)} tebal />
        </div>
        {tagihan.status === "sebagian" && (
          <Baris label="Sisa belum dibayar" nilai={formatRupiah(tagihan.sisa)} />
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
        {tagihan.periode_akhir && (
          <p className="t-body-sm flex items-center gap-2 text-fg-secondary">
            <CalendarClock size={16} aria-hidden />
            Jatuh tempo {formatTanggal(tagihan.periode_akhir)}
          </p>
        )}
        {tagihan.tanggal_pembayaran && (
          <p className="t-body-sm flex items-center gap-2 text-success">
            <CheckCircle2 size={16} aria-hidden />
            Dibayar {formatTanggal(tagihan.tanggal_pembayaran)}
          </p>
        )}
      </div>
    </section>
  );
}
