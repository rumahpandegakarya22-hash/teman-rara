import "server-only";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { activeTenant } from "@/db/schema";

/**
 * Isi email di data Ops hanya bila masih kosong. true = ada baris yang diubah.
 * Kolom email UNIQUE di Ops: bila bentrok dengan penghuni lain, dilewati diam-diam
 * (klaim akun tidak boleh gagal hanya karena ini).
 */
export async function isiEmailKosong(idPenghuni: string, email: string): Promise<boolean> {
  try {
    const hasil = await db
      .update(activeTenant)
      .set({ email, updated_at: new Date().toISOString() })
      .where(
        and(eq(activeTenant.id_penghuni, idPenghuni), or(isNull(activeTenant.email), eq(activeTenant.email, ""))),
      )
      .returning({ id: activeTenant.id_penghuni });
    return hasil.length > 0;
  } catch (e) {
    console.error("[klaim] isi email dilewati:", e);
    return false;
  }
}
