"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { activeTenant, trNotificationPreference } from "@/db/schema";
import { normalisasiHp } from "@/lib/phone";
import { getPenghuniAktif } from "@/lib/tenant";

/**
 * Hanya email dan nomor HP yang boleh diubah penghuni (keputusan Owner).
 * Nama tidak, karena dipakai di invoice dan laporan bulanan.
 */
const profilSchema = z.object({
  email: z.email("Alamat email tidak valid").max(150),
  no_hp: z
    .string()
    .trim()
    .refine((v) => /^0[0-9]{8,13}$/.test(normalisasiHp(v)), "Nomor HP tidak valid"),
});

export type ProfilState = { error?: string; sukses?: string };

export async function simpanProfil(_prev: ProfilState, formData: FormData): Promise<ProfilState> {
  const penghuni = await getPenghuniAktif();
  if (!penghuni) return { error: "Sesi tidak valid. Coba masuk ulang." };

  const parsed = profilSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  try {
    await db
      .update(activeTenant)
      .set({
        email: parsed.data.email,
        no_hp: normalisasiHp(parsed.data.no_hp),
        updated_at: new Date().toISOString(),
      })
      .where(eq(activeTenant.id_penghuni, penghuni.id_penghuni));
  } catch {
    return { error: "Gagal menyimpan perubahan." };
  }

  revalidatePath("/profil");
  revalidatePath("/kamar");
  return { sukses: "Data kontak berhasil diperbarui." };
}

const JENIS = ["push", "email", "in_app"] as const;
const preferensiSchema = z.object({ jenis: z.enum(JENIS), aktif: z.boolean() });

export async function simpanPreferensi(jenis: string, aktif: boolean) {
  const penghuni = await getPenghuniAktif();
  if (!penghuni) return { ok: false as const, error: "Sesi tidak valid." };

  const parsed = preferensiSchema.safeParse({ jenis, aktif });
  if (!parsed.success) return { ok: false as const, error: "Preferensi tidak dikenal." };

  const kolom = { push: "push_enabled", email: "email_enabled", in_app: "in_app_enabled" }[
    parsed.data.jenis
  ] as "push_enabled" | "email_enabled" | "in_app_enabled";

  try {
    await db
      .insert(trNotificationPreference)
      .values({ id_penghuni: penghuni.id_penghuni, [kolom]: parsed.data.aktif })
      .onConflictDoUpdate({
        target: trNotificationPreference.id_penghuni,
        set: { [kolom]: parsed.data.aktif, updated_at: new Date().toISOString() },
      });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Gagal menyimpan preferensi." };
  }
}
