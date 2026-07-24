import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessageSquareWarning, Plus } from "lucide-react";
import EmptyState from "@/components/empty-state";
import SewaBerakhir from "@/components/sewa-berakhir";
import StatusPengaduan from "@/components/status-pengaduan";
import { formatTanggal } from "@/lib/format";
import { wajibMasuk } from "@/lib/guard";
import { LABEL_KATEGORI } from "@/lib/kategori";
import { getDaftarPengaduan } from "@/lib/request";
import { getSesiPenghuni } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PengaduanPage() {
  await wajibMasuk("/pengaduan");

  const sesi = await getSesiPenghuni();
  if (sesi.status === "belum_klaim") redirect("/onboarding");
  if (sesi.status !== "aktif") return <SewaBerakhir />;
  const { penghuni } = sesi;

  const daftar = await getDaftarPengaduan(penghuni.id_penghuni);

  return (
    <main className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="t-h1">Pengaduan</h1>
        <p className="t-body-sm mt-2 text-fg-secondary">
          Laporkan kerusakan atau kendala di kamarmu, lalu pantau penanganannya.
        </p>
      </header>

      {daftar.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="Belum ada pengaduan"
          description="Kalau ada yang rusak atau mengganggu, laporkan lewat tombol tambah di bawah."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {daftar.map((item) => (
            <li key={item.id_complain}>
              <Link
                href={`/pengaduan/${item.id_complain}`}
                className="flex items-start gap-3 rounded-lg border border-line bg-raised p-5 elev-1"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="t-overline text-fg-secondary">
                      {LABEL_KATEGORI[item.category]}
                    </span>
                    <StatusPengaduan status={item.status} />
                  </div>
                  <h2 className="t-h3 mt-1 truncate">{item.title}</h2>
                  {item.reported_at && (
                    <p className="t-caption mt-1 text-fg-secondary">{formatTanggal(item.reported_at)}</p>
                  )}
                </div>
                <ChevronRight size={20} className="mt-1 shrink-0 text-fg-secondary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/pengaduan/baru"
        aria-label="Buat pengaduan baru"
        className="fixed bottom-[88px] right-4 z-30 flex min-h-14 items-center gap-2 rounded-full bg-action px-5 t-label text-on-action elev-3 active:bg-action-pressed"
      >
        <Plus size={24} aria-hidden />
        Pengaduan Baru
      </Link>
    </main>
  );
}
