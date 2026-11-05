// Data dummy untuk UJI COBA modul Pembayaran Sewa (dan pendukung tes Pengajuan
// Checkout / Pindah Kamar) atas nama Anindya Farah (KTD-2406-001, kamar 18).
//
// Membuat SATU invoice sewa belum-lunas yang jatuh tempo dalam <=7 hari supaya
// kartu "Tagihan Sewa" + tombol unggah bukti muncul di /kamar. Ditandai jelas
// lewat no_inv 'INV/DUMMY/...' agar gampang dibedakan & dibersihkan.
//
// Buat data:    node --env-file=.env scripts/dummy-anindya.mjs
// Hapus data:   node --env-file=.env scripts/dummy-anindya.mjs --hapus
import { createClient } from "@libsql/client";
import { wajibIzinProduksi } from "./_guard.mjs";

wajibIzinProduksi();

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});
const q = (sql, args = []) => db.execute({ sql, args });

const ID_PENGHUNI = "KTD-2406-001";
const NO_KAMAR = "18";
const NAMA = "Anindya Farah";
const EMAIL = "rumahpandegakarya22@gmail.com";
const NO_INV = "INV/DUMMY/18/UAT";
const hapusSaja = process.argv.includes("--hapus");

// Selalu bersihkan dummy lama dulu (idempotent).
await q(`DELETE FROM invoice_sewa WHERE no_inv = ?`, [NO_INV]);

if (hapusSaja) {
  console.log(`Dummy invoice '${NO_INV}' dihapus.`);
  process.exit(0);
}

// Jatuh tempo 4 hari dari sekarang supaya masuk ambang tampil (<=7 hari).
const hariIni = new Date();
const akhir = new Date(hariIni.getTime() + 4 * 86_400_000).toISOString().slice(0, 10);
const awal = new Date(hariIni.getTime() - 26 * 86_400_000).toISOString().slice(0, 10);
const HARGA = 1_200_000;

await q(
  `INSERT INTO invoice_sewa
     (no_inv, id_penghuni, nama, email, tanggal_pembayaran, periode_awal, periode_akhir,
      no_kamar, jumlah_bulan, harga_sewa, tambahan_listrik, denda, jumlah_denda,
      total_sewa, total_listrik, total_denda, diskon, pajak, subtotal, grand_total,
      tipe_kamar, checked, created_at)
   VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 1, ?, 0, 0, 0, ?, 0, 0, 0, 0, ?, ?, ?, 0, ?)`,
  [NO_INV, ID_PENGHUNI, NAMA, EMAIL, awal, akhir, NO_KAMAR, HARGA, HARGA, HARGA, HARGA,
   "Classic (AC)", new Date().toISOString()],
);

const [row] = (await q(`SELECT id, no_inv, periode_akhir, grand_total FROM invoice_sewa WHERE no_inv = ?`, [NO_INV])).rows;
console.log("Dummy invoice dibuat:");
console.log(`  id=${row.id} · ${row.no_inv} · jatuh tempo ${row.periode_akhir} · Rp${Number(row.grand_total).toLocaleString("id-ID")} · BELUM lunas`);
console.log("  Login sebagai Anindya → buka menu Kamar untuk melihat Tagihan Sewa.");
