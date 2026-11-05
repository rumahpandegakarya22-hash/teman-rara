"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { activeTenant, trAccount } from "@/db/schema";
import { hpSama } from "@/lib/phone";
import { emailSama, namaSama } from "@/lib/email";
import { ambilIp } from "@/lib/ip";
import { cobaPakai } from "@/lib/rate-limit";

const schema = z.object({
  no_kamar: z.string().trim().min(1, "Nomor kamar wajib diisi").max(10),
  no_hp: z.string().trim().min(9, "Nomor HP tidak valid").max(20),
  nama: z.string().trim().min(2, "Nama wajib diisi").max(100),
});

export type OnboardingState = { error?: string };

/**
 * Klaim akun: hanya penghuni yang sedang tinggal yang boleh punya akun.
 * Bukti kepemilikan utama = email yang SUDAH DIVERIFIKASI Clerk sama dengan email
 * di baris `active_tenant` (nomor HP dan nama bukan rahasia, jadi hanya pelengkap).
 * Baris itu dihapus trigger saat check-out, jadi mantan penghuni otomatis tidak
 * bisa mendaftar.
 */
export async function klaimAkun(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  await auth.protect();
  const user = await currentUser();
  if (!user) return { error: "Sesi tidak valid. Coba masuk ulang." };

  // Batas per akun Clerk DAN per IP: penyerang bisa membuat banyak akun Clerk.
  const ip = ambilIp(await headers());
  const [perAkun, perIp] = await Promise.all([
    cobaPakai(`klaim-user:${user.id}`, 5, 900),
    cobaPakai(`klaim-ip:${ip}`, 20, 3600),
  ]);
  if (!perAkun.ok || !perIp.ok) {
    return { error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi atau hubungi pengelola." };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data yang dikirim tidak valid." };
  }
  const { no_kamar, no_hp, nama } = parsed.data;

  // Pesan gagal sengaja disamakan untuk semua sebab, supaya tidak bisa dipakai
  // menebak kamar mana yang terisi atau nomor HP siapa yang terdaftar.
  const gagal = { error: "Data tidak cocok dengan penghuni yang terdaftar. Pastikan nomor kamar, nama, nomor HP, dan email akun sama dengan data saat check-in." };

  try {
    const [penghuni] = await db
      .select({
        id_penghuni: activeTenant.id_penghuni,
        no_hp: activeTenant.no_hp,
        nama: activeTenant.nama_lengkap,
        panggilan: activeTenant.nama_panggilan,
        email: activeTenant.email,
      })
      .from(activeTenant)
      .where(eq(activeTenant.no_kamar, no_kamar))
      .limit(1);

    if (!penghuni?.id_penghuni) return gagal;
    const idPenghuni = penghuni.id_penghuni;
    if (!hpSama(penghuni.no_hp, no_hp)) return gagal;
    if (!namaSama(nama, penghuni.nama, penghuni.panggilan)) return gagal;
    const emailTerverifikasi = user.emailAddresses
      .filter((e) => e.verification?.status === "verified")
      .map((e) => e.emailAddress);
    if (!emailTerverifikasi.some((e) => emailSama(e, penghuni.email))) return gagal;

    const [sudahDiklaim] = await db
      .select({ clerk_user_id: trAccount.clerk_user_id })
      .from(trAccount)
      .where(eq(trAccount.id_penghuni, penghuni.id_penghuni))
      .limit(1);

    if (sudahDiklaim && sudahDiklaim.clerk_user_id !== user.id) {
      return { error: "Kamar ini sudah tertaut ke akun lain. Hubungi pengelola kalau ini keliru." };
    }

    // Klaim ulang oleh akun yang sama (mis. tombol ditekan dua kali) tidak dianggap error.
    if (!sudahDiklaim) {
      await db.insert(trAccount).values({ id_penghuni: idPenghuni, clerk_user_id: user.id });
    }
  } catch {
    return { error: "Gagal menyimpan data. Coba lagi sebentar." };
  }

  redirect("/kamar");
}
