// Uji integrasi lapisan data Teman Rara terhadap replika skema produksi.
// Menguji hal yang tidak butuh sesi Clerk: klaim akun, baca dasbor, kirim
// pengaduan, deteksi perubahan status, dan pemutusan akses saat check-out.
// Jalankan: node --env-file=.env scripts/smoke-integrasi.mjs
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:")) {
  console.error("Tolak jalan: DATABASE_URL harus file lokal.");
  process.exit(1);
}

const db = createClient({ url });
const q = async (sql, args = []) => (await db.execute({ sql, args })).rows;
const CLERK_ID = "user_uji_integrasi";

let lulus = 0;
let gagal = 0;
function cek(nama, syarat, detail = "") {
  if (syarat) {
    lulus++;
    console.log(`  OK   ${nama}`);
  } else {
    gagal++;
    console.log(`  GAGAL ${nama} ${detail}`);
  }
}

const normalisasiHp = (n) => {
  const a = String(n).replace(/[^0-9+]/g, "");
  if (a.startsWith("+62")) return "0" + a.slice(3);
  if (a.startsWith("62")) return "0" + a.slice(2);
  return a;
};

// Bersihkan sisa uji sebelumnya.
await q(`DELETE FROM tr_complain_photo WHERE id_penghuni LIKE 'KTD-%'`);
await q(`DELETE FROM tr_complain_sync WHERE id_complain LIKE 'CMP-UJI%'`);
await q(`DELETE FROM tenant_complain WHERE id_complain LIKE 'CMP-UJI%'`);
await q(`DELETE FROM tr_account WHERE clerk_user_id = ?`, [CLERK_ID]);

console.log("\n1. Klaim akun oleh penghuni aktif");
const [target] = await q(`SELECT id_penghuni, no_kamar, no_hp FROM active_tenant LIMIT 1`);
cek("ada penghuni aktif di active_tenant", !!target);

const [cocok] = await q(`SELECT id_penghuni, no_hp FROM active_tenant WHERE no_kamar = ?`, [target.no_kamar]);
cek("no_hp cocok setelah normalisasi", normalisasiHp(cocok.no_hp) === normalisasiHp(target.no_hp));

await q(`INSERT INTO tr_account (id_penghuni, clerk_user_id) VALUES (?,?)`, [target.id_penghuni, CLERK_ID]);
const [akun] = await q(`SELECT id_penghuni FROM tr_account WHERE clerk_user_id = ?`, [CLERK_ID]);
cek("akun tertaut ke id_penghuni", akun?.id_penghuni === target.id_penghuni);

console.log("\n2. Klaim ditolak untuk yang bukan penghuni");
const [kamarKosong] = await q(
  `SELECT k.no_kamar FROM kamar k LEFT JOIN active_tenant a ON a.kamar_id = k.id_kamar
    WHERE a.kamar_id IS NULL LIMIT 1`,
);
const hasilKosong = await q(`SELECT id_penghuni FROM active_tenant WHERE no_kamar = ?`, [
  String(kamarKosong.no_kamar),
]);
cek("kamar tanpa penghuni tidak bisa diklaim", hasilKosong.length === 0);

const hpSalah = await q(`SELECT id_penghuni FROM active_tenant WHERE no_kamar = ? AND no_hp = ?`, [
  target.no_kamar,
  "089999999999",
]);
cek("nomor HP salah ditolak", hpSalah.length === 0);

console.log("\n3. Dasbor: kamar, WiFi, tagihan");
const [dasbor] = await q(
  `SELECT t.id_penghuni, a.nama_lengkap, k.no_kamar, k.harga_bulan, w.username, w.password
     FROM tr_account t
     JOIN active_tenant a ON a.id_penghuni = t.id_penghuni
     JOIN kamar k ON k.id_kamar = a.kamar_id
     LEFT JOIN tr_kamar_wifi w ON w.id_kamar = k.id_kamar
    WHERE t.clerk_user_id = ? AND t.revoked_at IS NULL`,
  [CLERK_ID],
);
cek("join dasbor mengembalikan data", !!dasbor);
cek("harga sewa terbaca dari tabel kamar", Number(dasbor.harga_bulan) > 0);
cek("kredensial WiFi terbaca via FK id_kamar", !!dasbor.username && !!dasbor.password);

const [tagihan] = await q(
  `SELECT id, no_inv, grand_total, periode_akhir, tanggal_pembayaran FROM invoice_sewa
    WHERE id_penghuni = ? ORDER BY periode_akhir DESC LIMIT 1`,
  [target.id_penghuni],
);
cek("tagihan terbaca dari invoice_sewa existing", !!tagihan);
cek("jatuh tempo memakai periode_akhir", !!tagihan.periode_akhir);
cek("status belum lunas (tanggal_pembayaran NULL)", tagihan.tanggal_pembayaran === null);

console.log("\n4. Kirim pengaduan ke tabel existing");
const idComplain = `CMP-UJI-${Date.now().toString().slice(-6)}`;
await q(
  `INSERT INTO tenant_complain (id_complain, id_penghuni, category, title, description, status, reported_at)
   VALUES (?,?,?,?,?,?,?)`,
  [idComplain, target.id_penghuni, "Listrik", "Lampu kamar mati", "Sejak semalam lampu tidak menyala.", "Menunggu", "2026-07-23"],
);
await q(`INSERT INTO tr_complain_sync (id_complain, last_status, last_notified_at) VALUES (?,?,?)`, [
  idComplain,
  "Menunggu",
  new Date().toISOString(),
]);
await q(
  `INSERT INTO tr_complain_photo (id, id_complain, id_penghuni, file_url, file_type, file_size)
   VALUES (?,?,?,?,?,?)`,
  [crypto.randomUUID(), idComplain, target.id_penghuni, "/api/berkas/aduan-uji.jpg", "image/jpeg", 12345],
);

const [aduan] = await q(`SELECT status, category FROM tenant_complain WHERE id_complain = ?`, [idComplain]);
cek("pengaduan masuk tenant_complain", aduan?.status === "Menunggu");
cek("kategori lolos CHECK constraint existing", aduan?.category === "Listrik");

const foto = await q(`SELECT id FROM tr_complain_photo WHERE id_complain = ?`, [idComplain]);
cek("foto tersimpan di tabel Teman Rara", foto.length === 1);

console.log("\n5. Kategori di luar enum ditolak database");
let ditolak = false;
try {
  await q(
    `INSERT INTO tenant_complain (id_complain, id_penghuni, category, title, status)
     VALUES (?,?,?,?,?)`,
    [`CMP-UJI-BAD`, target.id_penghuni, "Perabot", "Uji", "Menunggu"],
  );
} catch {
  ditolak = true;
}
cek("kategori 'Perabot' ditolak (tidak ada di enum existing)", ditolak);

console.log("\n6. Deteksi perubahan status oleh pengelola");
await q(`UPDATE tenant_complain SET status = 'Diproses' WHERE id_complain = ?`, [idComplain]);
const berubah = await q(
  `SELECT c.id_complain, c.status, s.last_status FROM tenant_complain c
     LEFT JOIN tr_complain_sync s ON s.id_complain = c.id_complain
    WHERE s.id_complain IS NULL OR s.last_status != c.status`,
);
cek("perubahan status terdeteksi", berubah.some((r) => r.id_complain === idComplain), JSON.stringify(berubah));

await q(`UPDATE tr_complain_sync SET last_status = 'Diproses' WHERE id_complain = ?`, [idComplain]);
const setelahSync = await q(
  `SELECT c.id_complain FROM tenant_complain c
     JOIN tr_complain_sync s ON s.id_complain = c.id_complain
    WHERE s.last_status != c.status AND c.id_complain = ?`,
  [idComplain],
);
cek("tidak ada notifikasi ganda setelah dicatat", setelahSync.length === 0);

console.log("\n7. Status baku tersedia di settings");
const opsi = await q(
  `SELECT nilai FROM settings WHERE grup='LOGBOOK_FEEDBACK' AND kolom='Status' AND aktif=1 ORDER BY urutan`,
);
const nilai = opsi.map((r) => r.nilai);
cek("Menunggu, Diproses, Selesai terdaftar", ["Menunggu", "Diproses", "Selesai"].every((v) => nilai.includes(v)), nilai.join("/"));

console.log("\n8. Check-out memutus akses");
await q(`UPDATE booking SET status_booking = 'Check-out' WHERE no_booking = 'BOOK-UJI-001'`);
const masihAktif = await q(`SELECT kamar_id FROM active_tenant WHERE id_penghuni = ?`, [target.id_penghuni]);
cek("trigger menghapus baris active_tenant", masihAktif.length === 0);

const dasborSetelah = await q(
  `SELECT t.id_penghuni FROM tr_account t
     JOIN active_tenant a ON a.id_penghuni = t.id_penghuni
    WHERE t.clerk_user_id = ?`,
  [CLERK_ID],
);
cek("dasbor tidak bisa dibuka lagi", dasborSetelah.length === 0);

const akunSelamat = await q(`SELECT id_penghuni FROM tr_account WHERE clerk_user_id = ?`, [CLERK_ID]);
cek("tautan akun tetap ada (tidak ikut terhapus)", akunSelamat.length === 1);

const riwayatSelamat = await q(`SELECT id_complain FROM tenant_complain WHERE id_penghuni = ?`, [
  target.id_penghuni,
]);
cek("riwayat pengaduan tetap utuh", riwayatSelamat.length >= 1);

console.log("\n9. Regresi: kamar yatim tidak mungkin ada");
// Bug UAT: /kamar dan /onboarding saling melempar tanpa henti ketika status
// penghuni dihitung tanpa join kamar sedangkan datanya dengan join. Sekarang
// keduanya memakai satu fungsi (getSesiPenghuni), dan foreign key di bawah
// memastikan sebabnya pun tidak bisa muncul dari sisi data.
let fkJalan = false;
try {
  await q(`INSERT INTO active_tenant (kamar_id, nama_lengkap, no_kamar, id_penghuni)
           VALUES ('KTD-TIDAK-ADA','Uji Yatim','999',NULL)`);
} catch (e) {
  fkJalan = String(e).includes("FOREIGN KEY");
}
cek("active_tenant.kamar_id wajib punya pasangan di kamar", fkJalan);

const yatim = await q(
  `SELECT a.kamar_id FROM active_tenant a
     LEFT JOIN kamar k ON k.id_kamar = a.kamar_id
    WHERE k.id_kamar IS NULL`,
);
cek("tidak ada penghuni aktif tanpa data kamar", yatim.length === 0);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
