"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { trPindahRequest } from "@/db/schema";
import { PINDAH_KAMAR_AKTIF, adaPindahMenunggu, getKamarKosong } from "@/lib/pengajuan";
import { kirimKePengelola } from "@/lib/push";
import { getPenghuniAktif } from "@/lib/tenant";
import { hariIniWIB } from "@/lib/waktu";

const schema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal rencana pindah tidak valid"),
  no_kamar_baru: z.string().trim().min(1, "Kamar tujuan wajib dipilih").max(10),
  alasan: z.string().trim().min(3, "Alasan wajib diisi").max(500),
  catatan: z.string().trim().max(500).optional().or(z.literal("")),
});

export type PengajuanState = { error?: string };

export async function kirimPengajuanPindah(
  _prev: PengajuanState,
  formData: FormData,
): Promise<PengajuanState> {
  if (!PINDAH_KAMAR_AKTIF) return { error: "Fitur pindah kamar sedang dinonaktifkan." };
  const penghuni = await getPenghuniAktif();
  if (!penghuni) return { error: "Kamu belum terhubung ke kamar mana pun." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ada isian yang belum benar." };
  const d = parsed.data;

  const kamarLama = String(penghuni.no_kamar);
  if (d.no_kamar_baru === kamarLama) return { error: "Kamar tujuan sama dengan kamar sekarang." };
  if (d.tanggal < hariIniWIB()) {
    return { error: "Tanggal rencana pindah tidak boleh sebelum hari ini." };
  }

  // Validasi ulang di server: kamar tujuan harus benar-benar kosong & tanpa
  // booking aktif saat ini (jangan percaya pilihan client).
  const tersedia = await getKamarKosong(kamarLama);
  if (!tersedia.some((k) => String(k.no_kamar) === d.no_kamar_baru)) {
    return { error: "Kamar tujuan sudah tidak tersedia. Pilih kamar lain." };
  }

  if (await adaPindahMenunggu(penghuni.id_penghuni)) {
    return { error: "Kamu masih punya pengajuan pindah kamar yang sedang diproses pengelola." };
  }

  try {
    await db.insert(trPindahRequest).values({
      id_penghuni: penghuni.id_penghuni,
      no_kamar_lama: kamarLama,
      no_kamar_baru: d.no_kamar_baru,
      tanggal: d.tanggal,
      alasan: d.alasan,
      catatan: d.catatan || null,
    });
  } catch (e) {
    console.error("[pengajuan-pindah] gagal:", e);
    return { error: "Gagal menyimpan pengajuan. Coba lagi sebentar." };
  }

  await kirimKePengelola({
    title: "Pengajuan pindah kamar baru",
    body: `${penghuni.nama} minta pindah dari Kamar ${kamarLama} ke ${d.no_kamar_baru} (${d.tanggal}).`,
    url: "/pengajuan/pindah",
  }).catch((e) => console.error("[pengajuan-pindah] notif gagal:", e));

  revalidatePath("/pengajuan/pindah");
  redirect("/pengajuan/pindah?terkirim=1");
}

export type BatalState = { error?: string };

export async function batalkanPindah(_prev: BatalState, formData: FormData): Promise<BatalState> {
  const penghuni = await getPenghuniAktif();
  if (!penghuni) return { error: "Sesi tidak dikenali." };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Pengajuan tidak dikenali." };

  try {
    const hasil = await db
      .update(trPindahRequest)
      .set({ status: "Dibatalkan", updated_at: new Date().toISOString() })
      .where(
        and(
          eq(trPindahRequest.id, id),
          eq(trPindahRequest.id_penghuni, penghuni.id_penghuni),
          eq(trPindahRequest.status, "Menunggu"),
        ),
      )
      .returning({ id: trPindahRequest.id });
    if (hasil.length === 0) return { error: "Pengajuan sudah diproses pengelola, tidak bisa dibatalkan." };
  } catch (e) {
    console.error("[pengajuan-pindah] batal gagal:", e);
    return { error: "Gagal membatalkan. Coba lagi." };
  }

  revalidatePath("/pengajuan/pindah");
  return {};
}
