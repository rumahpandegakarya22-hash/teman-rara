import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";

// Pecah per statement: executeMultiple gagal pada blok CREATE TRIGGER ... END.
function pecahStatement(sql: string): string[] {
  const bersih = sql.replace(/^\s*--.*$/gm, "");
  const keluar: string[] = [];
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

const DIR = path.resolve(__dirname, "../../db/migrations");

/**
 * DB SQLite in-memory baru dengan skema replika Ops + semua migrasi tr_*.
 * Pakai di test lewat:
 *   vi.mock("@/db", async () => { const t = await buatDbUji(); return { db: t.db }; })
 */
export async function buatDbUji() {
  const client = createClient({ url: ":memory:" });
  const tr = readdirSync(DIR)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .sort();
  for (const f of ["_replika_000.sql", "_replika_001.sql", ...tr]) {
    const semua = pecahStatement(readFileSync(path.join(DIR, f), "utf8"));
    const isTabel = (s: string) => /^\s*CREATE\s+TABLE/i.test(s);
    for (const sql of [...semua.filter(isTabel), ...semua.filter((s) => !isTabel(s))]) {
      await client.execute(sql);
    }
  }
  return { client, db: drizzle(client, { schema }) };
}
