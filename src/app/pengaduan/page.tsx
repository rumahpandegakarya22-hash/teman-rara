import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessageSquareWarning, Plus } from "lucide-react";
import EmptyState from "@/components/empty-state";
import SewaBerakhir from "@/components/sewa-berakhir";
import StatusPengaduan from "@/components/status-pengaduan";
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger";
import { formatTanggal } from "@/lib/format";
import { wajibMasuk } from "@/lib/guard";
import { LABEL_KATEGORI } from "@/lib/kategori";
import { getDaftarMasukan, getDaftarPengaduan } from "@/lib/request";
import { getSesiPenghuni } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PengaduanPage({
  searchParams,
}: {
  searchParams: Promise<{ terkirim?: string }>;
}) {
  await wajibMasuk("/pengaduan");

  const sesi = await getSesiPenghuni();
  if (sesi.status === "belum_klaim") redirect("/onboarding");
  if (sesi.status !== "aktif") return <SewaBerakhir />;
  const { penghuni } = sesi;

  const [daftar, masukan, { terkirim }] = await Promise.all([
    getDaftarPengaduan(penghuni.id_penghuni),
    getDaftarMasukan(penghuni.id_penghuni),
    searchParams,
  ]);

  return (
    <main className="px-4 pt-6">
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="t-h1">Pengaduan</h1>
          <p className="t-body-sm mt-2 text-fg-secondary">
            Laporkan kerusakan atau kendala di kamarmu, lalu pantau penanganannya.
          </p>
        </div>
        <Link
          href="/pengaduan/baru"
          className="btn-anim mt-1 flex shrink-0 items-center gap-2 rounded-full bg-action px-4 py-2 t-label text-on-action"
        >
          <Plus size={16} aria-hidden />
          Baru
        </Link>
      </header>
      </StaggerItem>

      {/* Saran & Kritik tidak punya halaman detail untuk dituju setelah kirim,
          jadi tanpa penanda ini pengirimnya kembali ke daftar tanpa tahu apakah
          masukannya benar-benar masuk. */}
      {terkirim === "1" && (
        <StaggerItem>
        <p role="status" className="rounded-md bg-raised p-4 t-body-sm border border-line">
          Masukanmu sudah terkirim. Terima kasih.
        </p>
        </StaggerItem>
      )}

      {daftar.length === 0 && masukan.length === 0 ? (
        <StaggerItem>
        <div className="flex flex-col gap-4">
          <EmptyState
            icon={MessageSquareWarning}
            title="Belum ada pengaduan"
            description="Kalau ada yang rusak atau mengganggu, laporkan dari sini."
          />
          <Link
            href="/pengaduan/baru"
            className="btn-anim flex min-h-12 items-center justify-center gap-2 rounded-lg bg-action px-5 t-label text-on-action"
          >
            <Plus size={18} aria-hidden />
            Buat Pengaduan Baru
          </Link>
        </div>
        </StaggerItem>
      ) : (
        <StaggerItem>
        <ul className="flex flex-col gap-3">
          {daftar.map((item) => (
            <li key={item.id_complain}>
              <Link
                href={`/pengaduan/${item.id_complain}`}
                className="btn-anim flex items-start gap-3 rounded-lg border border-line bg-raised p-5 elev-1"
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
                <ChevronRight size={20} className="icon-flow mt-1 shrink-0 text-fg-secondary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        </StaggerItem>
      )}

      {masukan.length > 0 && (
        <StaggerItem>
        <section className="mb-24">
          <h2 className="t-h3 mb-3">Saran &amp; Kritik</h2>
          {/* Tidak bisa diklik: berbeda dari pengaduan, masukan tidak punya alur
              penanganan untuk dipantau — isinya sudah seluruhnya di kartu ini. */}
          <ul className="flex flex-col gap-3">
            {masukan.map((m) => (
              <li key={m.id} className="rounded-lg border border-line bg-raised p-5 elev-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="t-overline text-fg-secondary">{m.jenis}</span>
                  <span className="t-overline text-fg-secondary">· {LABEL_KATEGORI[m.category]}</span>
                </div>
                <p className="t-body mt-1 whitespace-pre-line">{m.isi}</p>
                {m.tanggal && (
                  <p className="t-caption mt-1 text-fg-secondary">{formatTanggal(m.tanggal)}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
        </StaggerItem>
      )}
    </StaggerContainer>
    </main>
  );
}
