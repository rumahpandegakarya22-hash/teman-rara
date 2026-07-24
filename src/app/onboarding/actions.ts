"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { activeTenant, trAccount } from "@/db/schema";
import { hpSama } from "@/lib/phone";

const schema = z.object({
  no_kamar: z.string().trim().min(1, "Nomor kamar wajib diisi").max(10),
  no_hp: z.string().trim().min(9, "Nomor HP tidak valid").max(20),
});

export type OnboardingState = { error?: string };

// Batas percobaan per akun Clerk. Disimpan di memori proses: cukup untuk skala
// 30 kamar, dan penyerang tetap butuh akun Clerk terverifikasi per percobaan.
const percobaan = new Map<string, { jumlah: number; sampai: number }>();
const MAKS_PERCOBAAN = 5;
const JENDELA_MS = 15 * 60_000;

function lewatBatas(userId: string) {
  const sekarang = Date.now();
  const catatan = percobaan.get(userId);
  if (!catatan || catatan.sampai < sekarang) {
    percobaan.set(userId, { jumlah: 1, sampai: sekarang + JENDELA_MS });
    return false;
  }
  catatan.jumlah += 1;
  return catatan.jumlah > MAKS_PERCOBAAN;
}

/**
 * Klaim akun: hanya penghuni yang sedang tinggal yang boleh punya akun.
 * Bukti kepemilikan = kombinasi nomor kamar dan nomor HP yang cocok dengan
 * baris `active_tenant`. Baris itu dihapus trigger saat check-out, jadi mantan
 * penghuni otomatis tidak bisa mendaftar.
 */
export async function klaimAkun(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  await auth.protect();
  const user = await currentUser();
  if (!user) return { error: "Sesi tidak valid. Coba masuk ulang." };

  if (lewatBatas(user.id)) {
    return { error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi atau hubungi pengelola." };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data yang dikirim tidak valid." };
  }
  const { no_kamar, no_hp } = parsed.data;

  // Pesan gagal sengaja disamakan untuk semua sebab, supaya tidak bisa dipakai
  // menebak kamar mana yang terisi atau nomor HP siapa yang terdaftar.
  const gagal = { error: "Nomor kamar dan nomor HP tidak cocok dengan data penghuni." };

  try {
    const [penghuni] = await db
      .select({
        id_penghuni: activeTenant.id_penghuni,
        no_hp: activeTenant.no_hp,
        nama: activeTenant.nama_lengkap,
      })
      .from(activeTenant)
      .where(eq(activeTenant.no_kamar, no_kamar))
      .limit(1);

    if (!penghuni?.id_penghuni) return gagal;
    if (!hpSama(penghuni.no_hp, no_hp)) return gagal;

    const [sudahDiklaim] = await db
      .select({ clerk_user_id: trAccount.clerk_user_id })
      .from(trAccount)
      .where(eq(trAccount.id_penghuni, penghuni.id_penghuni))
      .limit(1);

    if (sudahDiklaim && sudahDiklaim.clerk_user_id !== user.id) {
      return { error: "Kamar ini sudah tertaut ke akun lain. Hubungi pengelola kalau ini keliru." };
    }

    // Klaim ulang oleh akun yang sama (mis. tombol ditekan dua kali) tidak
    // dianggap error, cukup lewati insert dan lanjut ke dasbor.
    if (!sudahDiklaim) {
      await db.insert(trAccount).values({
        id_penghuni: penghuni.id_penghuni,
        clerk_user_id: user.id,
      });
    }

    // Lengkapi email di data existing kalau memang masih kosong. Ini satu dari
    // dua kolom yang boleh ditulis Teman Rara (keputusan Owner: email & no_hp).
    const emailClerk = user.primaryEmailAddress?.emailAddress;
    if (emailClerk) {
      await db
        .update(activeTenant)
        .set({ email: emailClerk, updated_at: new Date().toISOString() })
        .where(eq(activeTenant.id_penghuni, penghuni.id_penghuni));
    }
  } catch {
    return { error: "Gagal menyimpan data. Coba lagi sebentar." };
  }

  percobaan.delete(user.id);
  redirect("/kamar");
}
