// Uji alur pendaftaran penghuni baru terhadap replika skema produksi.
// Membuktikan: booking 'Pending' TIDAK memicu trigger check-in, data lengkap
// tersimpan, dan baru saat staf set 'Check-in' penghuni jadi aktif.
// Jalankan: node --env-file=.env.replika scripts/smoke-pendaftaran.mjs
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:")) {
  console.error("Tolak jalan: DATABASE_URL harus file lokal.");
  process.exit(1);
}
const db = createClient({ url });
const q = async (sql, args = []) => (await db.execute({ sql, args })).rows;

let lulus = 0,
  gagal = 0;
const cek = (nama, syarat, detail = "") => {
  if (syarat) {
    lulus++;
    console.log(`  OK   ${nama}`);
  } else {
    gagal++;
    console.log(`  GAGAL ${nama} ${detail}`);
  }
};

const NO = `TR-UJI-${Date.now().toString().slice(-6)}`;
await q(`DELETE FROM tr_pendaftaran WHERE no_booking LIKE 'TR-UJI-%'`);
await q(`DELETE FROM booking WHERE no_booking LIKE 'TR-UJI-%'`);

// Kamar kosong.
const [kosong] = await q(
  `SELECT k.no_kamar FROM kamar k LEFT JOIN active_tenant a ON a.kamar_id = k.id_kamar
    WHERE a.kamar_id IS NULL ORDER BY k.no_kamar LIMIT 1`,
);
cek("ada kamar kosong untuk didaftar", !!kosong);

console.log("\n1. Kirim pendaftaran (status Pending)");
await q(
  `INSERT INTO booking (no_booking, tanggal_booking, nama_penyewa, no_hp, kamar_no, tgl_masuk, status_booking, sumber_leads, catatan)
   VALUES (?,?,?,?,?,?,?,?,?)`,
  [NO, "2026-07-24", "Calon Uji", "628123456789", kosong.no_kamar, "2026-08-01", "Pending", "Teman Rara", "uji"],
);
await q(
  `INSERT INTO tr_pendaftaran (no_booking, email, nama_lengkap, no_hp, no_kamar, rencana_masuk,
     pekerjaan, program_studi, institusi, darurat1_nama, darurat1_nomor, darurat1_relasi,
     jumlah_gadget, url_identitas, url_bukti_dp)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [NO, "uji@contoh.id", "Calon Uji", "628123456789", String(kosong.no_kamar), "2026-08-01",
   "Mahasiswi", "Teknik Mesin", "UGM", "Ibu Uji", "628999888777", "Ibu", 2,
   "/api/berkas/ID_KTP", "/api/berkas/ID_DP"],
);
cek("booking tersimpan", (await q(`SELECT 1 FROM booking WHERE no_booking = ?`, [NO])).length === 1);
cek("data diri lengkap tersimpan", (await q(`SELECT 1 FROM tr_pendaftaran WHERE no_booking = ?`, [NO])).length === 1);

console.log("\n2. Status Pending TIDAK memicu trigger check-in");
const oh = await q(`SELECT 1 FROM occupancy_history WHERE no_kamar = ?`, [String(kosong.no_kamar)]);
const at = await q(`SELECT 1 FROM active_tenant WHERE no_kamar = ?`, [String(kosong.no_kamar)]);
cek("occupancy_history belum dibuat", oh.length === 0, `(${oh.length})`);
cek("active_tenant belum dibuat", at.length === 0, `(${at.length})`);

console.log("\n3. Validasi database menolak data tidak sah");
let tolakGadget = false;
try {
  await q(
    `INSERT INTO tr_pendaftaran (no_booking, email, nama_lengkap, no_hp, no_kamar, rencana_masuk,
       pekerjaan, institusi, darurat1_nama, darurat1_nomor, darurat1_relasi, jumlah_gadget,
       url_identitas, url_bukti_dp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ["TR-UJI-BAD", "x@y.id", "X", "628", "1", "2026-08-01", "Mahasiswi", "UGM", "A", "628", "Ibu", 9, "a", "b"],
  );
} catch {
  tolakGadget = true;
}
cek("jumlah_gadget 9 ditolak (batas 1-5)", tolakGadget);

let tolakKerja = false;
try {
  await q(
    `INSERT INTO tr_pendaftaran (no_booking, email, nama_lengkap, no_hp, no_kamar, rencana_masuk,
       pekerjaan, institusi, darurat1_nama, darurat1_nomor, darurat1_relasi, jumlah_gadget,
       url_identitas, url_bukti_dp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ["TR-UJI-BAD2", "x@y.id", "X", "628", "1", "2026-08-01", "Dosen", "UGM", "A", "628", "Ibu", 2, "a", "b"],
  );
} catch {
  tolakKerja = true;
}
cek("pekerjaan di luar Karyawati/Mahasiswi ditolak", tolakKerja);

console.log("\n4. Staf set Check-in → penghuni jadi aktif");
await q(`UPDATE booking SET status_booking = 'Check-in' WHERE no_booking = ?`, [NO]);
const ohSetelah = await q(`SELECT id_penghuni FROM occupancy_history WHERE no_kamar = ?`, [String(kosong.no_kamar)]);
const atSetelah = await q(`SELECT id_penghuni FROM active_tenant WHERE no_kamar = ?`, [String(kosong.no_kamar)]);
cek("trigger membuat occupancy_history", ohSetelah.length === 1, JSON.stringify(ohSetelah));
cek("trigger membuat active_tenant", atSetelah.length === 1, JSON.stringify(atSetelah));
cek("pendaftaran tetap tertaut ke booking", (await q(`SELECT 1 FROM tr_pendaftaran WHERE no_booking = ?`, [NO])).length === 1);

console.log("\n5. Sumber leads 'Teman Rara' terdaftar di settings");
const sl = await q(`SELECT nilai FROM settings WHERE grup='LOG_SALES' AND kolom='Sumber Leads' AND nilai='Teman Rara'`);
cek("opsi 'Teman Rara' ada", sl.length === 1);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
