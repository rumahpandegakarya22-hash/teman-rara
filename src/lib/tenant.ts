import "server-only";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activeTenant,
  invoiceSewa,
  kamar,
  payment,
  trAccount,
  trKamarWifi,
  trPaymentProof,
} from "@/db/schema";

export type SesiPenghuni =
  | { status: "tamu" | "belum_klaim" | "berakhir"; penghuni: null }
  | { status: "aktif"; penghuni: NonNullable<Awaited<ReturnType<typeof cariPenghuni>>> };

/**
 * Satu-satunya penentu status penghuni. Halaman tidak boleh punya kriteria
 * sendiri: dulu status dan data penghuni dihitung dua fungsi berbeda, yang satu
 * ikut join tabel kamar dan yang satu tidak, sehingga /kamar dan /onboarding
 * bisa saling melempar tanpa henti.
 *
 * "berakhir" mencakup penghuni yang sudah check-out (trigger existing menghapus
 * baris active_tenant) maupun data kamar yang tidak lagi lengkap.
 */
export async function getSesiPenghuni(): Promise<SesiPenghuni> {
  // Bypass login KHUSUS dev lokal — butuh DUA syarat sekaligus, dan `NODE_ENV`
  // di Vercel selalu 'production' sehingga variabel yang tak sengaja terbawa ke
  // sana tetap mati. Akun yang dipakai diambil dari tr_account sungguhan supaya
  // yang tampil data asli, bukan penghuni karangan.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "1") {
    const [akunDev] = await db
      .select({ id_penghuni: trAccount.id_penghuni })
      .from(trAccount)
      .where(isNull(trAccount.revoked_at))
      .limit(1);
    if (!akunDev) return { status: "belum_klaim", penghuni: null };
    const p = await cariPenghuni(akunDev.id_penghuni);
    return p ? { status: "aktif", penghuni: p } : { status: "berakhir", penghuni: null };
  }

  const { userId } = await auth();
  if (!userId) return { status: "tamu", penghuni: null };

  const [akun] = await db
    .select({ id_penghuni: trAccount.id_penghuni, revoked_at: trAccount.revoked_at })
    .from(trAccount)
    .where(eq(trAccount.clerk_user_id, userId))
    .limit(1);

  if (!akun) return { status: "belum_klaim", penghuni: null };
  if (akun.revoked_at) return { status: "berakhir", penghuni: null };

  const penghuni = await cariPenghuni(akun.id_penghuni);
  return penghuni ? { status: "aktif", penghuni } : { status: "berakhir", penghuni: null };
}

async function cariPenghuni(idPenghuni: string) {
  const [row] = await db
    .select({
      id_penghuni: activeTenant.id_penghuni,
      nama: activeTenant.nama_lengkap,
      no_hp: activeTenant.no_hp,
      email: activeTenant.email,
      tanggal_masuk: activeTenant.tanggal_masuk,
      id_kamar: kamar.id_kamar,
      no_kamar: kamar.no_kamar,
      tipe_kamar: kamar.tipe_kamar,
      harga_bulan: kamar.harga_bulan,
      harga_3bulan: kamar.harga_3bulan,
      harga_6bulan: kamar.harga_6bulan,
      harga_9bulan: kamar.harga_9bulan,
      harga_tahun: kamar.harga_tahun,
      fasilitas: kamar.fasilitas,
      wifi_ssid: trKamarWifi.username,
      wifi_password: trKamarWifi.password,
    })
    .from(activeTenant)
    .innerJoin(kamar, eq(kamar.id_kamar, activeTenant.kamar_id))
    .leftJoin(trKamarWifi, eq(trKamarWifi.id_kamar, kamar.id_kamar))
    .where(eq(activeTenant.id_penghuni, idPenghuni))
    .limit(1);

  if (!row?.id_penghuni) return null;
  return { ...row, id_penghuni: row.id_penghuni };
}

/** Dipakai route API dan server action yang hanya butuh datanya. */
export async function getPenghuniAktif() {
  const sesi = await getSesiPenghuni();
  return sesi.penghuni;
}

/**
 * Tagihan sewa terbaru. Jatuh tempo memakai `periode_akhir` sesuai keputusan
 * Owner. Status dihitung, bukan disimpan: sistem existing menandai lunas lewat
 * `tanggal_pembayaran`, dan cicilan tercatat sebagai baris `payment` terpisah.
 */
export async function getTagihanTerbaru(idPenghuni: string) {
  const [inv] = await db
    .select({
      id: invoiceSewa.id,
      no_inv: invoiceSewa.no_inv,
      periode_awal: invoiceSewa.periode_awal,
      periode_akhir: invoiceSewa.periode_akhir,
      jumlah_bulan: invoiceSewa.jumlah_bulan,
      harga_sewa: invoiceSewa.harga_sewa,
      tambahan_listrik: invoiceSewa.tambahan_listrik,
      total_sewa: invoiceSewa.total_sewa,
      total_listrik: invoiceSewa.total_listrik,
      subtotal: invoiceSewa.subtotal,
      diskon: invoiceSewa.diskon,
      pajak: invoiceSewa.pajak,
      grand_total: invoiceSewa.grand_total,
      tanggal_pembayaran: invoiceSewa.tanggal_pembayaran,
    })
    .from(invoiceSewa)
    .where(eq(invoiceSewa.id_penghuni, idPenghuni))
    .orderBy(desc(invoiceSewa.periode_akhir))
    .limit(1);

  if (!inv) return null;

  const [bayar] = await db
    .select({ dibayar: sql<number>`COALESCE(SUM(${payment.amount}), 0)` })
    .from(payment)
    .where(and(eq(payment.invoice_sewa_id, inv.id), eq(payment.status, "Paid")));

  const total = inv.grand_total ?? 0;
  const dibayar = Math.round(bayar?.dibayar ?? 0);
  const hariIni = new Date().toISOString().slice(0, 10);

  const status: "lunas" | "sebagian" | "nunggak" | "belum" = inv.tanggal_pembayaran
    ? "lunas"
    : dibayar > 0 && dibayar < total
      ? "sebagian"
      : inv.periode_akhir && inv.periode_akhir < hariIni
        ? "nunggak"
        : "belum";

  return { ...inv, dibayar, sisa: Math.max(total - dibayar, 0), status };
}

/** Semua tagihan penghuni, terbaru dulu. Dipakai halaman Riwayat Pembayaran. */
export function getRiwayatTagihan(idPenghuni: string, limit = 50) {
  return db
    .select({
      id: invoiceSewa.id,
      no_inv: invoiceSewa.no_inv,
      periode_awal: invoiceSewa.periode_awal,
      periode_akhir: invoiceSewa.periode_akhir,
      grand_total: invoiceSewa.grand_total,
      tanggal_pembayaran: invoiceSewa.tanggal_pembayaran,
    })
    .from(invoiceSewa)
    .where(eq(invoiceSewa.id_penghuni, idPenghuni))
    .orderBy(desc(invoiceSewa.periode_akhir))
    .limit(limit);
}

/** Riwayat bukti bayar. Selalu difilter per penghuni. */
export function getRiwayatBukti(idPenghuni: string, limit = 10) {
  return db
    .select({
      id: trPaymentProof.id,
      file_url: trPaymentProof.file_url,
      created_at: trPaymentProof.created_at,
      verified_at: trPaymentProof.verified_at,
      rejected_at: trPaymentProof.rejected_at,
      rejected_reason: trPaymentProof.rejected_reason,
      catatan: trPaymentProof.catatan,
    })
    .from(trPaymentProof)
    .where(eq(trPaymentProof.id_penghuni, idPenghuni))
    .orderBy(desc(trPaymentProof.created_at))
    .limit(limit);
}
