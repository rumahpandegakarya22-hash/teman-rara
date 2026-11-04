import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { trClaimCode } from "@/db/schema";
import { hariIniWIB, tambahHari } from "@/lib/waktu";

// 32 karakter (pas untuk `byte & 31`, jadi tanpa bias). Tanpa I, O, 0, 1 supaya
// tidak tertukar saat dibaca dari kartu atau pesan.
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PANJANG = 8;
const BERLAKU_HARI = 30;

type Exec = Pick<typeof db, "insert" | "update">;

const sha256Hex = async (teks: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(teks)))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const normalisasi = (kode: string) => kode.toUpperCase().replace(/[\s-]/g, "");

/** Buat kode baru (menimpa yang lama, termasuk yang sudah terpakai). Dikembalikan SEKALI, tidak bisa dibaca lagi. */
export async function buatKodeKlaim(idPenghuni: string, exec: Exec = db): Promise<string> {
  const acak = crypto.getRandomValues(new Uint8Array(PANJANG));
  const kode = [...acak].map((b) => ALFABET[b & 31]).join("");
  const hash = await sha256Hex(kode);
  const kedaluwarsa = new Date(`${tambahHari(hariIniWIB(), BERLAKU_HARI)}T00:00:00+07:00`).toISOString();

  await exec
    .insert(trClaimCode)
    .values({ id_penghuni: idPenghuni, code_hash: hash, expires_at: kedaluwarsa })
    .onConflictDoUpdate({
      target: trClaimCode.id_penghuni,
      set: { code_hash: hash, expires_at: kedaluwarsa, used_at: null, created_at: new Date().toISOString() },
    });
  return kode;
}

/**
 * Pakai kode: true bila cocok, belum dipakai, dan belum kedaluwarsa. Satu UPDATE
 * atomik, jadi dua pemakaian bersamaan tidak mungkin sama-sama berhasil. Yang
 * dibandingkan hash, bukan kode, jadi perbandingan biasa di SQL aman.
 */
export async function pakaiKodeKlaim(
  idPenghuni: string,
  kode: string,
  exec: Exec = db,
  sekarang: Date = new Date(),
): Promise<boolean> {
  const hash = await sha256Hex(normalisasi(kode));
  const hasil = await exec
    .update(trClaimCode)
    .set({ used_at: sekarang.toISOString() })
    .where(
      and(
        eq(trClaimCode.id_penghuni, idPenghuni),
        eq(trClaimCode.code_hash, hash),
        isNull(trClaimCode.used_at),
        gt(trClaimCode.expires_at, sekarang.toISOString()),
      ),
    )
    .returning({ id: trClaimCode.id_penghuni });
  return hasil.length > 0;
}
