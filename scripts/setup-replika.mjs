// Bangun replika lokal skema produksi supaya Teman Rara bisa diuji tanpa
// menyentuh Turso. Menjalankan snapshot skema existing, lalu migrasi tr_*.
// Jalankan: node --env-file=.env scripts/setup-replika.mjs
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:")) {
  console.error("Tolak jalan: DATABASE_URL harus file lokal, bukan Turso.");
  process.exit(1);
}

const db = createClient({ url });

// Pisah per statement: executeMultiple gagal pada blok CREATE TRIGGER ... BEGIN ... END.
function pecahStatement(sql) {
  const bersih = sql.replace(/^\s*--.*$/gm, "");
  const keluar = [];
  let buffer = "";
  let dalamTrigger = false;

  for (const baris of bersih.split("\n")) {
    buffer += baris + "\n";
    if (/^\s*CREATE\s+TRIGGER/i.test(baris)) dalamTrigger = true;

    if (dalamTrigger) {
      if (/^\s*END\s*;/i.test(baris)) {
        keluar.push(buffer.trim());
        buffer = "";
        dalamTrigger = false;
      }
      continue;
    }
    if (baris.trimEnd().endsWith(";")) {
      if (buffer.trim()) keluar.push(buffer.trim());
      buffer = "";
    }
  }
  if (buffer.trim()) keluar.push(buffer.trim());
  return keluar.filter((s) => s.replace(/\s/g, "").length > 1);
}

// Snapshot skema existing memakai CREATE TABLE polos, jadi hanya bisa
// dijalankan sekali di database kosong. Migrasi 003 sendiri idempoten dan bisa
// diulang: `node scripts/setup-replika.mjs --hanya-003`.
const hanyaTr = process.argv.includes("--hanya-tr");
const migrasiTr = ["db/migrations/003_teman_rara.sql", "db/migrations/004_pendaftaran.sql"];
const berkas = hanyaTr
  ? migrasiTr
  : ["db/migrations/_replika_000.sql", "db/migrations/_replika_001.sql", ...migrasiTr];

for (const f of berkas) {
  const semua = pecahStatement(readFileSync(f, "utf8"));
  // Snapshot digenerate dari sqlite_master, urutannya tidak aman terhadap
  // dependensi: trigger bisa muncul sebelum tabel yang dirujuknya.
  const isTabel = (s) => /^\s*CREATE\s+TABLE/i.test(s);
  const statements = [...semua.filter(isTabel), ...semua.filter((s) => !isTabel(s))];
  let ok = 0;
  for (const sql of statements) {
    try {
      await db.execute(sql);
      ok++;
    } catch (e) {
      console.error(`GAGAL di ${f}:\n${sql.slice(0, 160)}\n  → ${e.message}`);
      process.exit(1);
    }
  }
  console.log(`${f}: ${ok} statement OK`);
}

const tabel = await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
);
console.log(`\nTotal ${tabel.rows.length} tabel. Tabel Teman Rara:`);
console.log(tabel.rows.map((r) => r.name).filter((n) => n.startsWith("tr_")).join(", "));
