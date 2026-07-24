import "server-only";
import { and, eq, gte, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { invoiceSewa, tenantComplain, trComplainSync } from "@/db/schema";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { normalisasiStatus } from "@/lib/kategori";
import { kirimKePenghuni } from "@/lib/push";

const HARI_SEBELUM = 3;

/**
 * Pengingat tagihan yang jatuh tempo dalam 3 hari ke depan.
 * Jatuh tempo memakai `invoice_sewa.periode_akhir`; belum bayar ditandai
 * `tanggal_pembayaran` yang masih NULL, mengikuti konvensi sistem existing.
 */
export async function jalankanPengingatJatuhTempo() {
  const hariIni = new Date().toISOString().slice(0, 10);
  const batas = new Date(Date.now() + HARI_SEBELUM * 86_400_000).toISOString().slice(0, 10);

  const jatuhTempo = await db
    .select({
      id_penghuni: invoiceSewa.id_penghuni,
      no_inv: invoiceSewa.no_inv,
      grand_total: invoiceSewa.grand_total,
      periode_akhir: invoiceSewa.periode_akhir,
    })
    .from(invoiceSewa)
    .where(
      and(
        isNull(invoiceSewa.tanggal_pembayaran),
        gte(invoiceSewa.periode_akhir, hariIni),
        lte(invoiceSewa.periode_akhir, batas),
      ),
    );

  let terkirim = 0;
  for (const t of jatuhTempo) {
    if (!t.id_penghuni || !t.periode_akhir) continue;
    const hasil = await kirimKePenghuni(t.id_penghuni, {
      title: "Pengingat pembayaran sewa",
      body: `${t.no_inv} sebesar ${formatRupiah(t.grand_total ?? 0)} jatuh tempo ${formatTanggal(t.periode_akhir)}.`,
      url: "/kamar",
    });
    terkirim += hasil.terkirim;
  }

  return { tagihan: jatuhTempo.length, notifikasi_terkirim: terkirim };
}

/**
 * Deteksi perubahan status pengaduan yang dilakukan pengelola di dashboard
 * existing. `tenant_complain` tidak punya kolom updated_at dan strukturnya tidak
 * boleh diubah, jadi perubahan dikenali dengan membandingkan status sekarang
 * terhadap catatan terakhir di `tr_complain_sync`.
 *
 * Catatan: status yang DITAMPILKAN ke penghuni selalu dibaca langsung dari
 * tenant_complain, jadi tetap akurat walau job ini baru jalan sekali sehari.
 * Job ini hanya menentukan kapan push dikirim.
 */
export async function sinkronStatusPengaduan() {
  const berubah = await db
    .select({
      id_complain: tenantComplain.id_complain,
      id_penghuni: tenantComplain.id_penghuni,
      title: tenantComplain.title,
      status: tenantComplain.status,
      last_status: trComplainSync.last_status,
    })
    .from(tenantComplain)
    .leftJoin(trComplainSync, eq(trComplainSync.id_complain, tenantComplain.id_complain))
    .where(or(isNull(trComplainSync.id_complain), ne(trComplainSync.last_status, tenantComplain.status)));

  let notifikasi = 0;
  let baru = 0;
  const sekarang = new Date().toISOString();

  for (const row of berubah) {
    const pertamaKali = row.last_status === null;
    const statusBaku = normalisasiStatus(row.status);

    if (!pertamaKali && normalisasiStatus(row.last_status) !== statusBaku) {
      const hasil = await kirimKePenghuni(row.id_penghuni, {
        title: `Pengaduan ${statusBaku}`,
        body: row.title,
        url: `/pengaduan/${row.id_complain}`,
      });
      notifikasi += hasil.terkirim;
    }
    if (pertamaKali) baru++;

    await db
      .insert(trComplainSync)
      .values({
        id_complain: row.id_complain,
        last_status: row.status,
        last_notified_at: pertamaKali ? null : sekarang,
      })
      .onConflictDoUpdate({
        target: trComplainSync.id_complain,
        set: { last_status: row.status, last_notified_at: sekarang, updated_at: sekarang },
      });
  }

  return { diperiksa: berubah.length, pertama_kali_dicatat: baru, notifikasi_terkirim: notifikasi };
}
