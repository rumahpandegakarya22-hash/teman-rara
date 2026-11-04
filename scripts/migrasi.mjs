// Jalankan file migrasi tr_* ke DATABASE_URL (tanpa perlu Turso CLI).
//   node --env-file=.env scripts/migrasi.mjs db/migrations/008_rate_limit.sql --ya-ini-produksi
//   node --env-file=.env scripts/migrasi.mjs --cek     (hanya cek tabel yang dibutuhkan)
// Hanya menerima file bernomor (008_..., 009_...), bukan _replika_*. Semua migrasi
// memakai CREATE TABLE IF NOT EXISTS, jadi aman diulang.
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { wajibIzinProduksi } from "./_guard.mjs";

const TABEL = ["tr_rate_limit", "tr_claim_code"];
const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});

async function cek() {
  const { rows } = await db.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${TABEL.map(() => "?").join(",")})`,
    TABEL,
  );
  const ada = new Set(rows.map((r) => String(r.name)));
  for (const t of TABEL) console.log(`${ada.has(t) ? "ADA  " : "BELUM"} ${t}`);
  return TABEL.every((t) => ada.has(t));
}

async function main() {
  if (process.argv.includes("--cek")) {
    process.exit((await cek()) ? 0 : 1);
  }
  const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!file || !/(^|[\/])\d{3}_[\w]+\.sql$/.test(file)) {
    console.error("Pakai: node --env-file=.env scripts/migrasi.mjs db/migrations/NNN_nama.sql --ya-ini-produksi");
    process.exit(1);
  }
  wajibIzinProduksi();
  await db.executeMultiple(readFileSync(file, "utf8"));
  console.log(`Migrasi ${file} selesai.\n`);
  await cek();
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});
