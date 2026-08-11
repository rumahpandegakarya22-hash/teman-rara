import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ChevronLeft, LogOut } from "lucide-react";
import FormPengajuanCheckout from "@/components/form-pengajuan-checkout";
import SewaBerakhir from "@/components/sewa-berakhir";
import StatusPengajuanBadge from "@/components/status-pengajuan-badge";
import TombolBatalPengajuan from "@/components/tombol-batal-pengajuan";
import { formatTanggal } from "@/lib/format";
import { wajibMasuk } from "@/lib/guard";
import { getCheckoutRequestTerakhir } from "@/lib/pengajuan";
import { getSesiPenghuni } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PengajuanCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ terkirim?: string }>;
}) {
  await wajibMasuk("/pengajuan/checkout");
  const sesi = await getSesiPenghuni();
  if (sesi.status === "belum_klaim") redirect("/onboarding");
  if (sesi.status !== "aktif") return <SewaBerakhir />;

  const [terakhir, { terkirim }] = await Promise.all([
    getCheckoutRequestTerakhir(sesi.penghuni.id_penghuni),
    searchParams,
  ]);
  const menunggu = terakhir?.status === "Menunggu";

  return (
    <main className="px-4 pt-4">
      <div className="safe-top" />
      <Link
        href="/profil"
        className="btn-anim -ml-2 inline-flex min-h-12 items-center gap-1 px-2 t-label text-fg-secondary"
      >
        <ChevronLeft size={20} className="icon-flow" aria-hidden />
        Profil
      </Link>

      <header className="mb-6 mt-2">
        <h1 className="t-h1 mt-1 flex items-center gap-2">
          <LogOut size={22} className="text-action" aria-hidden />
          Pengajuan Checkout
        </h1>
        <p className="t-body-sm mt-2 text-fg-secondary">
          Ajukan rencana keluar dari kamar. Pengelola akan memverifikasi dan menghubungi kamu sebelum
          proses checkout final (deposit, kondisi kamar, dll.).
        </p>
      </header>

      {terkirim && (
        <p className="mb-5 flex items-start gap-2 rounded-md border border-line bg-raised p-4 t-body-sm">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden />
          Pengajuan terkirim. Pengelola akan menindaklanjuti.
        </p>
      )}

      {terakhir && (
        <section className="mb-6 rounded-lg border border-line bg-raised p-5 elev-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="t-h3">Pengajuan terakhir</h2>
            <StatusPengajuanBadge status={terakhir.status} />
          </div>
          <dl className="mt-3 flex flex-col gap-1 t-body-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-secondary">Rencana keluar</dt>
              <dd>{formatTanggal(terakhir.tanggal_checkout)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-secondary">Alasan</dt>
              <dd className="text-right">{terakhir.alasan}</dd>
            </div>
            {terakhir.response_note && (
              <div className="flex justify-between gap-3">
                <dt className="text-fg-secondary">Catatan pengelola</dt>
                <dd className="text-right">{terakhir.response_note}</dd>
              </div>
            )}
          </dl>
          {menunggu && <TombolBatalPengajuan jenis="checkout" id={terakhir.id} />}
        </section>
      )}

      {menunggu ? (
        <p className="rounded-md border border-line bg-raised p-4 t-body-sm text-fg-secondary">
          Pengajuanmu sedang diproses pengelola. Batalkan dulu di atas kalau mau mengajukan yang baru.
        </p>
      ) : (
        <FormPengajuanCheckout />
      )}
    </main>
  );
}
