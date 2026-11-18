"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { trCheckoutRequest, trExitSurvey } from "@/db/schema";
import { NAMA_RATING, NAMA_TEKS, NAMA_YA_TIDAK } from "@/lib/exit-survey";
import { adaCheckoutMenunggu } from "@/lib/pengajuan";
import { kirimKePengelola } from "@/lib/push";
import { getPenghuniAktif } from "@/lib/tenant";
import { hariIniWIB } from "@/lib/waktu";

const schema = z.object({
  tanggal_checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal rencana keluar tidak valid"),
  alasan: z.string().trim().min(3, "Alasan wajib diisi").max(500),
  catatan: z.string().trim().max(500).optional().or(z.literal("")),
});

const rating = z.coerce.number().int().min(1).max(5);
const yaTidak = z.enum(["0", "1"]);
// Teks wajib diisi; penghuni menulis "-" bila tidak ada masukan (sama seperti Google Form).
const teks = z.string().trim().min(1).max(1000);

const surveySchema = z.object({
  ...Object.fromEntries(NAMA_RATING.map((k) => [k, rating])),
  ...Object.fromEntries(NAMA_YA_TIDAK.map((k) => [k, yaTidak])),
  ...Object.fromEntries(NAMA_TEKS.map((k) => [k, teks])),
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
  if (d.tanggal_checkout < hariIniWIB()) {
    return { error: "Tanggal rencana keluar tidak boleh sebelum hari ini." };
  }

  // Satu pengajuan menunggu dalam satu waktu — cegah kiriman ganda.
  if (await adaCheckoutMenunggu(penghuni.id_penghuni)) {
    return { error: "Kamu masih punya pengajuan checkout yang sedang diproses pengelola." };
  }

  // Survey opsional: kalau tidak ada satu pun rating yang diisi, dilewati.
  // Kalau sebagian diisi, semuanya harus lengkap supaya data bisa dibandingkan.
  const isiSurvey = [...NAMA_RATING, ...NAMA_YA_TIDAK, ...NAMA_TEKS].some(
    (k) => String(formData.get(k) ?? "").trim() !== "",
  );
  let survey: Record<string, unknown> | null = null;
  if (isiSurvey) {
    const hasil = surveySchema.safeParse(Object.fromEntries(formData));
    if (!hasil.success) return { error: "Lengkapi semua pertanyaan exit survey (tulis \"-\" bila tidak ada masukan), atau kosongkan seluruhnya." };
    survey = hasil.data as Record<string, unknown>;
  }

  try {
    await db.transaction(async (tx) => {
      const [req] = await tx
        .insert(trCheckoutRequest)
        .values({
          id_penghuni: penghuni.id_penghuni,
          no_kamar: String(penghuni.no_kamar),
          tanggal_checkout: d.tanggal_checkout,
          alasan: d.alasan,
          catatan: d.catatan || null,
        })
        .returning({ id: trCheckoutRequest.id });
      if (survey) {
        const n = (k: string) => Number(survey[k]);
        const t = (k: string) => String(survey[k]);
        await tx.insert(trExitSurvey).values({
          id_penghuni: penghuni.id_penghuni,
          checkout_request_id: req.id,
          rating_kebersihan_umum: n("rating_kebersihan_umum"),
          rating_furniture: n("rating_furniture"),
          rating_air: n("rating_air"),
          rating_wifi: n("rating_wifi"),
          rating_keamanan: n("rating_keamanan"),
          rating_bangunan: n("rating_bangunan"),
          masukan_fasilitas: t("masukan_fasilitas"),
          rating_keramahan: n("rating_keramahan"),
          rating_respon: n("rating_respon"),
          rating_aturan_jelas: n("rating_aturan_jelas"),
          rating_aturan_relevan: n("rating_aturan_relevan"),
          rating_pembayaran: n("rating_pembayaran"),
          masukan_pengelola: t("masukan_pengelola"),
          puas: t("puas") === "1",
          rekomendasi: t("rekomendasi") === "1",
          disukai: t("disukai"),
          tidak_disukai: t("tidak_disukai"),
        });
      }
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
