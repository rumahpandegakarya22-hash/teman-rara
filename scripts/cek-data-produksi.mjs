// Periksa kecocokan data yang dibutuhkan Teman Rara. Baca saja, tidak menulis
// apa pun, jadi aman dijalankan terhadap Turso produksi.
// Jalankan: node --env-file=.env scripts/cek-data-produksi.mjs
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});

const q = async (sql, args = []) => (await db.execute({ sql, args })).rows;

const penghuni = await q(`SELECT COUNT(*) AS n FROM active_tenant`);
console.log(`Penghuni aktif: ${penghuni[0].n}`);

const yatim = await q(
  `SELECT a.no_kamar, a.kamar_id FROM active_tenant a
     LEFT JOIN kamar k ON k.id_kamar = a.kamar_id
    WHERE k.id_kamar IS NULL`,
);
console.log(`Penghuni tanpa pasangan di tabel kamar: ${yatim.length}`);
if (yatim.length) console.table(yatim);

const tanpaId = await q(`SELECT no_kamar FROM active_tenant WHERE id_penghuni IS NULL OR id_penghuni = ''`);
console.log(`Penghuni tanpa id_penghuni (tidak bisa klaim akun): ${tanpaId.length}`);
if (tanpaId.length) console.table(tanpaId);

const kontak = await q(
  `SELECT SUM(CASE WHEN no_hp IS NULL OR no_hp = '' THEN 1 ELSE 0 END) AS hp_kosong,
          SUM(CASE WHEN email IS NULL OR email = '' THEN 1 ELSE 0 END) AS email_kosong
     FROM active_tenant`,
);
console.log(`Nomor HP kosong: ${kontak[0].hp_kosong} · Email kosong: ${kontak[0].email_kosong}`);

const wifi = await q(
  `SELECT COUNT(*) AS n FROM kamar k
     LEFT JOIN tr_kamar_wifi w ON w.id_kamar = k.id_kamar
    WHERE w.id_kamar IS NULL AND k.deleted_at IS NULL`,
).catch(() => q(`SELECT COUNT(*) AS n FROM kamar k LEFT JOIN tr_kamar_wifi w ON w.id_kamar = k.id_kamar WHERE w.id_kamar IS NULL`));
console.log(`Kamar belum punya kredensial WiFi: ${wifi[0].n}`);

const akun = await q(`SELECT COUNT(*) AS n FROM tr_account WHERE revoked_at IS NULL`);
console.log(`Akun Teman Rara aktif: ${akun[0].n}`);

const akunPutus = await q(
  `SELECT t.id_penghuni FROM tr_account t
     LEFT JOIN active_tenant a ON a.id_penghuni = t.id_penghuni
    WHERE a.id_penghuni IS NULL AND t.revoked_at IS NULL`,
);
console.log(`Akun aktif tapi penghuninya sudah check-out: ${akunPutus.length}`);
if (akunPutus.length) console.table(akunPutus);
