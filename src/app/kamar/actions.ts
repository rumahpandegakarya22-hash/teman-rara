"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { invoiceSewa, trPaymentProof } from "@/db/schema";
import { simpanGambar, validasiGambar } from "@/lib/storage";
import { getPenghuniAktif } from "@/lib/tenant";

export type UploadState = { error?: string; sukses?: string };

export async function unggahBukti(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const penghuni = await getPenghuniAktif();
  if (!penghuni) return { error: "Kamu belum terhubung ke kamar mana pun." };

  const file = formData.get("bukti");
  if (!(file instanceof File)) return { error: "Pilih foto bukti transfer dulu." };

  const cek = validasiGambar(file);
  if (!cek.ok) return { error: cek.pesan };

  const invoiceId = Number(formData.get("invoice_sewa_id"));
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return { error: "Tidak ada tagihan aktif untuk diunggah." };
  }

  // Pastikan tagihan memang milik penghuni ini. Jangan percaya id dari form.
  const [tagihan] = await db
    .select({ id: invoiceSewa.id })
    .from(invoiceSewa)
    .where(and(eq(invoiceSewa.id, invoiceId), eq(invoiceSewa.id_penghuni, penghuni.id_penghuni)))
    .limit(1);
  if (!tagihan) return { error: "Tagihan tidak ditemukan." };

  try {
    const fileUrl = await simpanGambar(file, "bukti");
    await db.insert(trPaymentProof).values({
      id_penghuni: penghuni.id_penghuni,
      invoice_sewa_id: tagihan.id,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
    });
  } catch {
    return { error: "Gagal menyimpan bukti. Coba lagi sebentar." };
  }

  revalidatePath("/kamar");
  return { sukses: "Bukti pembayaran berhasil diunggah. Menunggu verifikasi pengelola." };
}
