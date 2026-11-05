// Bandingkan src/db/schema.ts dengan DB (pakai token READ-ONLY).
// Jalankan: npm run db:cek-skema
import { createClient } from "@libsql/client";
import { bandingkanSkema } from "../src/lib/cek-skema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diset");
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  const selisih = await bandingkanSkema(client);
  if (selisih.length === 0) {
    console.log("Skema cocok.");
    return;
  }
  for (const s of selisih) console.error(`DRIFT ${s.tabel}: tidak ada di DB -> ${s.hilang.join(", ")}`);
  process.exit(1);
}
main();
