"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { trCheckoutRequest } from "@/db/schema";
import { adaCheckoutMenunggu } from "@/lib/pengajuan";
import { kirimKePengelola } from "@/lib/push";
import { getPenghuniAktif } from "@/lib/tenant";

const schema = z.object({
  tanggal_checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal rencana keluar tidak valid"),
  alasan: z.string().trim().min(3, "Alasan wajib diisi").max(500),
  catatan: z.string().trim().max(500).optional().or(z.literal("")),
});

export type PengajuanState = { error?: string };

export async function kirimPengajuanCheckout(
  _prev: PengajuanState,
  formData: FormData,
): Promise<PengajuanState> {
  const penghuni = await getPenghuniAktif();
  if (!penghuni) return { error: "Kamu belum terhubung ke kamar mana pun." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ada isian yang belum benar." };
  const d = parsed.data;

  // Tanggal keluar tidak boleh di masa lalu.
  if (d.tanggal_checkout < new Date().toISOString().slice(0, 10)) {
    return { error: "Tanggal rencana keluar tidak boleh sebelum hari ini." };
  }

  // Satu pengajuan menunggu dalam satu waktu — cegah kiriman ganda.
  if (await adaCheckoutMenunggu(penghuni.id_penghuni)) {
    return { error: "Kamu masih punya pengajuan checkout yang sedang diproses pengelola." };
  }

  try {
    await db.insert(trCheckoutRequest).values({
      id_penghuni: penghuni.id_penghuni,
      no_kamar: String(penghuni.no_kamar),
      tanggal_checkout: d.tanggal_checkout,
      alasan: d.alasan,
      catatan: d.catatan || null,
    });
  } catch (e) {
    console.error("[pengajuan-checkout] gagal:", e);
    return { error: "Gagal menyimpan pengajuan. Coba lagi sebentar." };
  }

  // Best-effort: kegagalan notifikasi tidak boleh membatalkan pengajuan.
  await kirimKePengelola({
    title: "Pengajuan checkout baru",
    body: `${penghuni.nama} (Kamar ${penghuni.no_kamar}) mengajukan checkout ${d.tanggal_checkout}.`,
    url: "/pengajuan/checkout",
  }).catch((e) => console.error("[pengajuan-checkout] notif gagal:", e));

  revalidatePath("/pengajuan/checkout");
  redirect("/pengajuan/checkout?terkirim=1");
}

export type BatalState = { error?: string };

/** Batalkan pengajuan sendiri selagi masih 'Menunggu'. */
export async function batalkanCheckout(_prev: BatalState, formData: FormData): Promise<BatalState> {
  const penghuni = await getPenghuniAktif();
  if (!penghuni) return { error: "Sesi tidak dikenali." };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Pengajuan tidak dikenali." };

  try {
    const hasil = await db
      .update(trCheckoutRequest)
      .set({ status: "Dibatalkan", updated_at: new Date().toISOString() })
      .where(
        and(
          eq(trCheckoutRequest.id, id),
          eq(trCheckoutRequest.id_penghuni, penghuni.id_penghuni),
          eq(trCheckoutRequest.status, "Menunggu"),
        ),
      )
      .returning({ id: trCheckoutRequest.id });
    if (hasil.length === 0) return { error: "Pengajuan sudah diproses pengelola, tidak bisa dibatalkan." };
  } catch (e) {
    console.error("[pengajuan-checkout] batal gagal:", e);
    return { error: "Gagal membatalkan. Coba lagi." };
  }

  revalidatePath("/pengajuan/checkout");
  return {};
}
