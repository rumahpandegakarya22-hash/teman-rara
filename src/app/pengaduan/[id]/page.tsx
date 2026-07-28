import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import StatusPengaduan from "@/components/status-pengaduan";
import TombolBatalPengaduan from "@/components/tombol-batal-pengaduan";
import { formatTanggal } from "@/lib/format";
import { wajibMasuk } from "@/lib/guard";
import { LABEL_KATEGORI, normalisasiStatus, STATUS_BISA_BATAL } from "@/lib/kategori";
import { getPengaduan } from "@/lib/request";
import { getPenghuniAktif } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function DetailPengaduanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await wajibMasuk(`/pengaduan/${id}`);

  const penghuni = await getPenghuniAktif();
  if (!penghuni) redirect("/onboarding");

  const aduan = await getPengaduan(id, penghuni.id_penghuni);
  if (!aduan) notFound();

  const bisaDibatalkan = STATUS_BISA_BATAL.includes(normalisasiStatus(aduan.status));

  return (
    <main className="px-4 pt-4">
      <div className="safe-top" />
      <Link
        href="/pengaduan"
        className="btn-anim -ml-2 inline-flex min-h-12 items-center gap-1 px-2 t-label text-fg-secondary"
      >
        <ChevronLeft size={20} className="icon-flow" aria-hidden />
        Pengaduan
      </Link>

      <article className="mt-2 flex flex-col gap-6">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-overline text-fg-secondary">{LABEL_KATEGORI[aduan.category]}</span>
            <StatusPengaduan status={aduan.status} />
          </div>
          <h1 className="t-h1 mt-2">{aduan.title}</h1>
          <p className="t-caption mt-2 text-fg-secondary">
            {aduan.reported_at && `Diajukan ${formatTanggal(aduan.reported_at)}`}
            {/* Kolomnya satu (`resolved_at`) untuk dua akhir yang berbeda —
                labelnya ikut status supaya pengaduan yang dibatalkan tidak
                terbaca "Selesai". */}
            {aduan.resolved_at &&
              ` · ${normalisasiStatus(aduan.status) === "Dibatalkan" ? "Dibatalkan" : "Selesai"} ${formatTanggal(aduan.resolved_at)}`}
          </p>
        </header>

        {aduan.description && (
          <section className="rounded-lg border border-line bg-raised p-5 elev-1">
            <h2 className="t-h3 mb-2">Rincian</h2>
            <p className="t-body whitespace-pre-line text-fg-secondary">{aduan.description}</p>
          </section>
        )}

        {aduan.response_note && (
          <section className="rounded-lg border border-line bg-raised p-5 elev-1">
            <h2 className="t-h3 mb-2">Tanggapan Pengelola</h2>
            <p className="t-body whitespace-pre-line">{aduan.response_note}</p>
            {aduan.responded_at && (
              <p className="t-caption mt-2 text-fg-secondary">{formatTanggal(aduan.responded_at)}</p>
            )}
          </section>
        )}

        {aduan.foto.length > 0 && (
          <section>
            <h2 className="t-h3 mb-3">Foto Bukti</h2>
            <ul className="grid grid-cols-2 gap-3">
              {aduan.foto.map((f) => (
                <li key={f.id}>
                  <a href={f.file_url} target="_blank" rel="noreferrer">
                    {/* Berkas dilayani route terproteksi, bukan CDN. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.file_url}
                      alt="Foto bukti pengaduan"
                      loading="lazy"
                      className="aspect-square w-full rounded-md border border-line object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {bisaDibatalkan && <TombolBatalPengaduan idComplain={aduan.id_complain} />}
      </article>
    </main>
  );
}
