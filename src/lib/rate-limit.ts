import "server-only";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { trRateLimit } from "@/db/schema";

/**
 * Hitung satu percobaan untuk `kunci` pada jendela waktu tetap. Satu statement
 * upsert atomik, jadi aman dipanggil paralel dari banyak isolate Workers.
 */
export async function cobaPakai(
  kunci: string,
  maks: number,
  jendelaDetik: number,
  sekarangMs: number = Date.now(),
): Promise<{ ok: boolean; sisa: number }> {
  // Waktu mulai jendela (detik epoch), supaya bisa dibandingkan saat pembersihan.
  const jendela = Math.floor(sekarangMs / 1000 / jendelaDetik) * jendelaDetik;
  try {
    const [baris] = await db
      .insert(trRateLimit)
      .values({ kunci, jendela, jumlah: 1 })
      .onConflictDoUpdate({
        target: [trRateLimit.kunci, trRateLimit.jendela],
        set: { jumlah: sql`${trRateLimit.jumlah} + 1` },
      })
      .returning({ jumlah: trRateLimit.jumlah });
    return { ok: baris.jumlah <= maks, sisa: Math.max(maks - baris.jumlah, 0) };
  } catch (e) {
    // Fail-open: rate limit hanya lapisan tambahan. Bila tabel belum dimigrasi
    // atau DB bermasalah, layanan utama tidak boleh ikut mati.
    console.error("[rate-limit] gagal, request dilewatkan:", e);
    return { ok: true, sisa: maks };
  }
}

/** Hapus baris yang jendelanya mulai lebih dari `umurDetik` yang lalu. */
export async function bersihkanRateLimit(sekarangMs: number = Date.now(), umurDetik = 86_400): Promise<number> {
  const batas = Math.floor(sekarangMs / 1000) - umurDetik;
  const hasil = await db.delete(trRateLimit).where(lt(trRateLimit.jendela, batas)).returning({ k: trRateLimit.kunci });
  return hasil.length;
}
