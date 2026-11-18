"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { trFeedbackRutin } from "@/db/schema";
import { getPenghuniAktif } from "@/lib/tenant";
import { hariIniWIB } from "@/lib/waktu";

const schema = z.object({
  rating: z.coerce.number().int().min(1, "Pilih nilai 1 sampai 5").max(5, "Pilih nilai 1 sampai 5"),
  komentar: z.string().trim().max(500).optional().or(z.literal("")),
});

export type FeedbackState = { error?: string; sukses?: boolean };

/** Satu isian per penghuni per bulan; PK (id_penghuni, periode) menolak kiriman ganda. */
export async function kirimFeedbackRutin(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const penghuni = await getPenghuniAktif();
  if (!penghuni) return { error: "Kamu belum terhubung ke kamar mana pun." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Isian belum benar." };

  const hasil = await db
    .insert(trFeedbackRutin)
    .values({
      id_penghuni: penghuni.id_penghuni,
      periode: hariIniWIB().slice(0, 7),
      rating: parsed.data.rating,
      komentar: parsed.data.komentar || null,
    })
    .onConflictDoNothing()
    .returning({ id: trFeedbackRutin.id_penghuni });
  if (hasil.length === 0) return { error: "Kamu sudah mengisi feedback bulan ini." };

  revalidatePath("/kamar");
  return { sukses: true };
}
