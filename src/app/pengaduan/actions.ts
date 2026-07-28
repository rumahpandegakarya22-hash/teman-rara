"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { feedback, tenantComplain, trComplainPhoto, trComplainSync } from "@/db/schema";
import { JENIS_MASUKAN, KATEGORI, STATUS_BISA_BATAL, jadiTiket } from "@/lib/kategori";
import { simpanGambar, validasiGambar } from "@/lib/storage";
import { getPenghuniAktif } from "@/lib/tenant";

const MAKS_FOTO = 3;

const schema = z.object({
  jenis: z.enum(JENIS_MASUKAN),
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
    jenis: formData.get("jenis"),
    category: formData.get("category"),
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data yang dikirim tidak valid." };
  }

  const tanggalKirim = new Date().toISOString().slice(0, 10);

  // Saran & Kritik bukan tiket: tidak ada yang perlu dipantau statusnya, jadi
  // masuk tabel `feedback` tanpa foto — sesuai pembagian yang sudah dipakai
  // handler Feedback di Mini Apps Ops.
  if (!jadiTiket(parsed.data.jenis)) {
    try {
      await db.insert(feedback).values({
        id_penghuni: penghuni.id_penghuni,
        nama: penghuni.nama,
        no_kamar: penghuni.no_kamar,
        category: parsed.data.category,
        // Format teks dipertahankan supaya fitur edit di Ops (yang mem-parse
        // pola ini) tetap bisa membaca baris yang dibuat dari sini.
        deskripsi: `[${tanggalKirim}] [${parsed.data.jenis}] ${parsed.data.title} — ${parsed.data.description}`,
        status: "Menunggu",
        reported_at: tanggalKirim,
      });
    } catch {
      return { error: "Gagal menyimpan masukan. Coba lagi sebentar." };
    }
    revalidatePath("/pengaduan");
    redirect("/pengaduan?terkirim=1");
  }

  const berkas = formData.getAll("foto").filter((f): f is File => f instanceof File && f.size > 0);
  if (berkas.length > MAKS_FOTO) return { error: `Maksimal ${MAKS_FOTO} foto.` };
  for (const f of berkas) {
    const cek = validasiGambar(f);
    if (!cek.ok) return { error: cek.pesan };
  }

  const tanggal = tanggalKirim;
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

export type BatalState = { error?: string };

/**
 * Batalkan pengaduan sendiri. Hanya boleh selagi belum disentuh pengelola —
 * begitu statusnya Diproses, pekerjaan mungkin sudah berjalan di lapangan dan
 * membatalkannya sepihak akan membuat catatan operasional tidak cocok.
 *
 * Baris TIDAK dihapus: pengaduan adalah jejak keluhan, dan angka "berapa yang
 * dibatalkan" ikut jadi bahan evaluasi. Statusnya diubah, bukan dibuang.
 *
 * `tr_complain_sync` sengaja tidak disentuh — perbedaan status dengan tabel itu
 * yang membuat cron harian tahu ada perubahan untuk dinotifikasikan.
 */
export async function batalkanPengaduan(
  _prev: BatalState,
  formData: FormData,
): Promise<BatalState> {
  const penghuni = await getPenghuniAktif();
  if (!penghuni) return { error: "Kamu belum terhubung ke kamar mana pun." };

  const id = String(formData.get("id_complain") ?? "").trim();
  if (!id) return { error: "Pengaduan tidak dikenali." };

  try {
    // Filter id_penghuni bukan sekadar validasi: tanpa itu, id tebakan bisa
    // dipakai membatalkan pengaduan orang lain.
    const hasil = await db
      .update(tenantComplain)
      .set({ status: "Dibatalkan", resolved_at: new Date().toISOString().slice(0, 10) })
      .where(
        and(
          eq(tenantComplain.id_complain, id),
          eq(tenantComplain.id_penghuni, penghuni.id_penghuni),
          inArray(tenantComplain.status, STATUS_BISA_BATAL),
        ),
      )
      .returning({ id: tenantComplain.id_complain });

    if (hasil.length === 0) {
      return { error: "Pengaduan ini sudah ditangani pengelola, jadi tidak bisa dibatalkan lagi." };
    }
  } catch {
    return { error: "Gagal membatalkan pengaduan. Coba lagi sebentar." };
  }

  revalidatePath("/pengaduan");
  revalidatePath(`/pengaduan/${id}`);
  return {};
}
