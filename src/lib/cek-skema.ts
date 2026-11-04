import { getTableName, is } from "drizzle-orm";
import { getTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { Client } from "@libsql/client";
import * as schema from "@/db/schema";

export type SelisihSkema = { tabel: string; hilang: string[] };

/**
 * Bandingkan schema.ts dengan DB sebenarnya. Hanya melaporkan kolom/tabel yang
 * dipetakan di schema.ts tapi tidak ada di DB (yang akan membuat query gagal);
 * kolom ekstra di DB tidak masalah. `["*"]` berarti seluruh tabel tidak ada.
 */
export async function bandingkanSkema(client: Client): Promise<SelisihSkema[]> {
  const hasil: SelisihSkema[] = [];
  for (const nilai of Object.values(schema)) {
    if (!is(nilai, SQLiteTable)) continue;
    const tabel = getTableName(nilai);
    const info = await client.execute(`PRAGMA table_info("${tabel}")`);
    if (info.rows.length === 0) {
      hasil.push({ tabel, hilang: ["*"] });
      continue;
    }
    const ada = new Set(info.rows.map((r) => String(r.name)));
    const hilang = getTableConfig(nilai)
      .columns.map((c) => c.name)
      .filter((n) => !ada.has(n));
    if (hilang.length > 0) hasil.push({ tabel, hilang });
  }
  return hasil;
}
