// Isi replika lokal dengan data uji: kamar, penghuni via trigger check-in,
// dan satu tagihan. Hanya untuk DB file lokal, tidak akan jalan di Turso.
// Jalankan: node --env-file=.env scripts/seed-uji.mjs
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:")) {
  console.error("Tolak jalan: DATABASE_URL harus file lokal, bukan Turso.");
  process.exit(1);
}

const db = createClient({ url });
const q = (sql, args = []) => db.execute({ sql, args });

// 30 kamar Properti A. Angka contoh, bukan tarif sungguhan.
for (let i = 0; i < 30; i++) {
  const lantai = Math.floor(i / 15) + 1;
  const no = lantai * 100 + ((i % 15) + 1);
  await q(
    `INSERT INTO kamar (id_kamar, no_kamar, tipe_kamar, lantai, fasilitas, harga_bulan, status)
     VALUES (?,?,?,?,?,?,?) ON CONFLICT(id_kamar) DO NOTHING`,
    [
      `KTD-${no}`,
      no,
      lantai === 1 ? "Eco" : "Classic",
      lantai,
      "Kasur dan lemari pakaian\nKamar mandi dalam, air panas\nAC dan meja belajar\nWiFi khusus per kamar",
      lantai === 1 ? 850_000 : 1_200_000,
      "Kosong",
    ],
  );
}

// Check-in lewat booking, supaya trigger existing yang mengisi
// occupancy_history dan active_tenant. Ini menguji integrasi, bukan menembak
// tabelnya langsung.
const noBooking = "BOOK-UJI-001";
await q(`DELETE FROM booking WHERE no_booking = ?`, [noBooking]);
await q(
  `INSERT INTO booking (no_booking, tanggal_booking, nama_penyewa, no_hp, kamar_no, tgl_masuk, durasi_bulan, harga_disepakati, status_booking)
   VALUES (?,?,?,?,?,?,?,?,?)`,
  [noBooking, "2026-07-01", "Sri Wahyuni", "081234567890", 101, "2026-07-01", 3, 850_000, "Check-in"],
);

const [penghuni] = (
  await q(`SELECT id_penghuni, nama, no_kamar FROM occupancy_history ORDER BY tanggal_mulai DESC LIMIT 1`)
).rows;

if (!penghuni) {
  console.error("Trigger check-in tidak membuat baris occupancy_history.");
  process.exit(1);
}

// Satu tagihan sewa yang jatuh tempo 2 hari lagi.
const jatuhTempo = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
await q(`DELETE FROM invoice_sewa WHERE no_inv = ?`, ["INV-UJI-001"]);
await q(
  `INSERT INTO invoice_sewa (no_inv, id_penghuni, nama, no_kamar, periode_awal, periode_akhir, jumlah_bulan, harga_sewa, total_sewa, grand_total)
   VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ["INV-UJI-001", penghuni.id_penghuni, penghuni.nama, "101", "2026-07-01", jatuhTempo, 1, 850_000, 850_000, 850_000],
);

const cek = await q(
  `SELECT a.id_penghuni, a.nama_lengkap, a.no_kamar, a.no_hp, k.harga_bulan, w.ssid
     FROM active_tenant a
     JOIN kamar k ON k.id_kamar = a.kamar_id
     LEFT JOIN tr_kamar_wifi w ON w.id_kamar = k.id_kamar`,
);

console.log("Penghuni aktif hasil trigger:");
console.table(cek.rows);
console.log(`Tagihan INV-UJI-001 jatuh tempo ${jatuhTempo}`);
