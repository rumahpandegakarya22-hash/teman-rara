"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { tenantComplain, trComplainPhoto, trComplainSync } from "@/db/schema";
import { KATEGORI } from "@/lib/kategori";
import { simpanGambar, validasiGambar } from "@/lib/storage";
import { getPenghuniAktif } from "@/lib/tenant";

const MAKS_FOTO = 3;

const schema = z.object({
  category: z.enum(KATEGORI),
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(100),
  description: z.string().trim().min(10, "Ceritakan kendalanya minimal 10 karakter").max(2000),
});

export type PengaduanState = { error?: string };

/** Format id mengikuti handler existing di kost-tiga-dara: CMP-YYYYMMDD-xxxxxxxx. */
function buatIdComplain(tanggal: string) {
  return `CMP-${tanggal.replace(/-/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function kirimPengaduan(
  _prev: PengaduanState,
  formData: FormData,
): Promise<PengaduanState> {
  const penghuni = await getPenghuniAktif();
  if (!penghuni) return { error: "Kamu belum terhubung ke kamar mana pun." };

  const parsed = schema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data yang dikirim tidak valid." };
  }

  const berkas = formData.getAll("foto").filter((f): f is File => f instanceof File && f.size > 0);
  if (berkas.length > MAKS_FOTO) return { error: `Maksimal ${MAKS_FOTO} foto.` };
  for (const f of berkas) {
    const cek = validasiGambar(f);
    if (!cek.ok) return { error: cek.pesan };
  }

  const tanggal = new Date().toISOString().slice(0, 10);
  const idComplain = buatIdComplain(tanggal);

  try {
    // Berkas ditulis lebih dulu: kalau gagal, tidak ada pengaduan yang terlanjur
    // tersimpan tanpa foto yang dijanjikan pengguna.
    const urls = await Promise.all(berkas.map((f) => simpanGambar(f, "aduan")));

    await db.transaction(async (tx) => {
      // Pengaduan masuk ke tabel existing supaya pengelola cukup memakai satu
      // dashboard. Strukturnya tidak diubah, hanya baris baru.
      await tx.insert(tenantComplain).values({
        id_complain: idComplain,
        id_penghuni: penghuni.id_penghuni,
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        status: "Menunggu",
        reported_at: tanggal,
      });

      // Catat status awal supaya cron tidak mengira ini perubahan dan
      // mengirim notifikasi palsu ke pelapor.
      await tx.insert(trComplainSync).values({
        id_complain: idComplain,
        last_status: "Menunggu",
        last_notified_at: new Date().toISOString(),
      });

      if (urls.length > 0) {
        await tx.insert(trComplainPhoto).values(
          urls.map((url, i) => ({
            id_complain: idComplain,
            id_penghuni: penghuni.id_penghuni,
            file_url: url,
            file_type: berkas[i].type,
            file_size: berkas[i].size,
          })),
        );
      }
    });
  } catch {
    return { error: "Gagal menyimpan pengaduan. Coba lagi sebentar." };
  }

  revalidatePath("/pengaduan");
  redirect(`/pengaduan/${idComplain}`);
}
