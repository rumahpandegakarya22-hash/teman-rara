import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, CheckCircle2, CircleAlert, CircleDashed, ReceiptText } from "lucide-react";
import EmptyState from "@/components/empty-state";
import SewaBerakhir from "@/components/sewa-berakhir";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { wajibMasuk } from "@/lib/guard";
import { getRiwayatTagihan, getSesiPenghuni } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function statusTagihan(tanggalBayar: string | null, jatuhTempo: string | null) {
  if (tanggalBayar) return { label: "Lunas", icon: CheckCircle2, kelas: "bg-[#E6F0E6] text-success" };
  const hariIni = new Date().toISOString().slice(0, 10);
  if (jatuhTempo && jatuhTempo < hariIni) {
    return { label: "Nunggak", icon: CircleAlert, kelas: "bg-red-100 text-red-600" };
  }
  return { label: "Belum Lunas", icon: CircleDashed, kelas: "bg-sunken text-fg-secondary" };
}

export default async function RiwayatPembayaranPage() {
  await wajibMasuk("/kamar/riwayat");

  const sesi = await getSesiPenghuni();
  if (sesi.status === "belum_klaim") redirect("/onboarding");
  if (sesi.status !== "aktif") return <SewaBerakhir />;

  const daftar = await getRiwayatTagihan(sesi.penghuni.id_penghuni);

  return (
    <main className="px-4 pt-4">
      <div className="safe-top" />
      <Link
        href="/kamar"
        className="btn-anim -ml-2 inline-flex min-h-12 items-center gap-1 px-2 t-label text-fg-secondary"
      >
        <ChevronLeft size={20} className="icon-flow" aria-hidden />
        Kamar
      </Link>

      <h1 className="t-h1 mb-2 mt-2">Riwayat Pembayaran</h1>
      <p className="t-body-sm mb-6 text-fg-secondary">
        Semua tagihan sewa kamar {sesi.penghuni.no_kamar}, terbaru di atas.
      </p>

      {daftar.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Belum ada tagihan"
          description="Riwayat akan terisi begitu pengelola menerbitkan invoice pertama."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {daftar.map((t) => {
            const { label, icon: Icon, kelas } = statusTagihan(t.tanggal_pembayaran, t.periode_akhir);
            return (
              <li key={t.id} className="rounded-lg border border-line bg-raised p-5 elev-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="t-overline truncate text-fg-secondary">{t.no_inv}</p>
                    <p className="t-h3 mt-1 tabular-nums">{formatRupiah(t.grand_total ?? 0)}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 t-label ${kelas}`}
                  >
                    <Icon size={14} aria-hidden />
                    {label}
                  </span>
                </div>

                {t.periode_awal && t.periode_akhir && (
                  <p className="t-caption mt-2 text-fg-secondary">
                    Periode {formatTanggal(t.periode_awal)} sampai {formatTanggal(t.periode_akhir)}
                  </p>
                )}
                {t.tanggal_pembayaran && (
                  <p className="t-caption mt-1 text-success">
                    Dibayar {formatTanggal(t.tanggal_pembayaran)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
