import { redirect } from "next/navigation";
import { BedDouble, ReceiptText, Sofa } from "lucide-react";
import DetailTagihan from "@/components/detail-tagihan";
import KalkulatorSewa from "@/components/kalkulator-sewa";
import RiwayatPembayaranSoon from "@/components/riwayat-pembayaran-soon";
import SewaBerakhir from "@/components/sewa-berakhir";
import UploadBukti from "@/components/upload-bukti";
import WifiCard from "@/components/wifi-card";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { wajibMasuk } from "@/lib/guard";
import { getRiwayatBukti, getSesiPenghuni, getTagihanTerbaru } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function KamarPage() {
  await wajibMasuk("/kamar");

  const sesi = await getSesiPenghuni();
  if (sesi.status === "belum_klaim") redirect("/onboarding");
  if (sesi.status !== "aktif") return <SewaBerakhir />;
  const { penghuni } = sesi;

  const tagihan = await getTagihanTerbaru(penghuni.id_penghuni);
  const riwayat = await getRiwayatBukti(penghuni.id_penghuni);

  // Tagihan hanya ditampilkan kalau belum lunas DAN jatuh tempo tinggal
  // <= 7 hari (termasuk yang sudah lewat).
  const HARI_TAMPIL = 7;
  const sisaHari = tagihan?.periode_akhir
    ? Math.ceil((new Date(tagihan.periode_akhir).getTime() - Date.now()) / 86_400_000)
    : null;
  const tampilkanTagihan =
    tagihan != null && tagihan.status !== "lunas" && sisaHari != null && sisaHari <= HARI_TAMPIL;
  const fasilitas = (penghuni.fasilitas ?? "")
    .split(/[\n,]/)
    .map((f) => f.trim())
    .filter(Boolean);

  return (
    <main className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="t-overline text-fg-secondary">Kamar {penghuni.no_kamar}</p>
        <h1 className="t-h1 mt-1">Halo, {penghuni.nama.split(" ")[0]}</h1>
      </header>

      <section className="rounded-lg border border-line bg-raised p-5 elev-1">
        <h2 className="t-h3 mb-4 flex items-center gap-2">
          <BedDouble size={20} className="text-action" aria-hidden />
          Sewa & Fasilitas
        </h2>

        {/* Nominal align-right, label di atasnya. */}
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="t-caption text-fg-secondary">Harga sewa</p>
              {penghuni.tipe_kamar && (
                <p className="t-caption text-fg-secondary">Tipe {penghuni.tipe_kamar}</p>
              )}
            </div>
            <p className="t-h3 tabular-nums text-right">
              {formatRupiah(penghuni.harga_bulan ?? 0)}
              <span className="t-body-sm text-fg-secondary"> /bln</span>
            </p>
          </div>

          {tagihan && (tagihan.tambahan_listrik ?? 0) > 0 && (
            <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
              <p className="t-caption text-fg-secondary">Biaya listrik tambahan</p>
              <p className="t-h3 tabular-nums text-right">
                {formatRupiah(tagihan.tambahan_listrik ?? 0)}
                <span className="t-body-sm text-fg-secondary"> /bln</span>
              </p>
            </div>
          )}
        </div>

        {fasilitas.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="t-label mb-3">Fasilitas</p>
            {/* Dua kolom. */}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {fasilitas.map((f) => (
                <li key={f} className="t-body-sm flex items-start gap-2">
                  <Sofa size={16} className="mt-0.5 shrink-0 text-fg-secondary" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {penghuni.wifi_ssid && penghuni.wifi_password && (
        <WifiCard ssid={penghuni.wifi_ssid} password={penghuni.wifi_password} />
      )}

      {/* Tagihan baru ditampilkan saat mendekati jatuh tempo (7 hari) atau sudah
          lewat. Di luar itu penghuni tidak perlu diingatkan. */}
      {tampilkanTagihan && tagihan && (
        <section aria-labelledby="judul-tagihan">
          <h2 id="judul-tagihan" className="t-h3 mb-3 flex items-center gap-2">
            <ReceiptText size={20} className="text-action" aria-hidden />
            Tagihan Sewa
          </h2>
          <div className="flex flex-col gap-4">
            <DetailTagihan tagihan={tagihan} />
            {tagihan.status !== "lunas" && <UploadBukti invoiceSewaId={tagihan.id} />}
          </div>
        </section>
      )}

      <KalkulatorSewa
        tarif={{
          harga_3bulan: penghuni.harga_3bulan,
          harga_6bulan: penghuni.harga_6bulan,
          harga_9bulan: penghuni.harga_9bulan,
          harga_tahun: penghuni.harga_tahun,
        }}
        tipeKamar={penghuni.tipe_kamar}
        listrikPerBulan={tagihan?.tambahan_listrik ?? 0}
        mulaiDari={tagihan?.periode_akhir ?? null}
      />

      <RiwayatPembayaranSoon />

      {riwayat.length > 0 && (
        <section>
          <h2 className="t-h3 mb-3">Riwayat Bukti Bayar</h2>
          <ul className="flex flex-col gap-2">
            {riwayat.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-md border border-line bg-raised p-4"
              >
                <div className="min-w-0">
                  <p className="t-body-sm font-medium">{formatTanggal(b.created_at)}</p>
                  <p className="t-caption text-fg-secondary">
                    {b.verified_at ? "Terverifikasi pengelola" : "Menunggu verifikasi"}
                  </p>
                </div>
                <a href={b.file_url} target="_blank" rel="noreferrer" className="t-label text-action">
                  Lihat
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
