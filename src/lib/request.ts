import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedback, tenantComplain, trComplainPhoto } from "@/db/schema";

export function getDaftarPengaduan(idPenghuni: string, limit = 30) {
  return db
    .select({
      id_complain: tenantComplain.id_complain,
      category: tenantComplain.category,
      title: tenantComplain.title,
      status: tenantComplain.status,
      reported_at: tenantComplain.reported_at,
    })
    .from(tenantComplain)
    .where(eq(tenantComplain.id_penghuni, idPenghuni))
    .orderBy(desc(tenantComplain.reported_at))
    .limit(limit);
}

/** Detail pengaduan. Difilter per penghuni supaya id tebakan tidak membocorkan data. */
export async function getPengaduan(idComplain: string, idPenghuni: string) {
  const [row] = await db
    .select({
      id_complain: tenantComplain.id_complain,
      category: tenantComplain.category,
      title: tenantComplain.title,
      description: tenantComplain.description,
      status: tenantComplain.status,
      reported_at: tenantComplain.reported_at,
      resolved_at: tenantComplain.resolved_at,
      response_note: tenantComplain.response_note,
      responded_at: tenantComplain.responded_at,
    })
    .from(tenantComplain)
    .where(and(eq(tenantComplain.id_complain, idComplain), eq(tenantComplain.id_penghuni, idPenghuni)))
    .limit(1);

  if (!row) return null;

  const foto = await db
    .select({ id: trComplainPhoto.id, file_url: trComplainPhoto.file_url })
    .from(trComplainPhoto)
    .where(eq(trComplainPhoto.id_complain, idComplain));

  return { ...row, foto };
}

/**
 * Saran & Kritik milik penghuni. Dipisah dari daftar pengaduan karena tidak
 * punya alur status yang bisa dipantau maupun halaman detail — isinya sudah
 * seluruhnya ada di baris ini.
 *
 * `deskripsi` tersimpan sebagai "[tanggal] [jenis] judul — isi" (format yang
 * dipakai bersama Mini Apps Ops). Di-parse balik di sini supaya penghuni
 * melihat teksnya sendiri, bukan penanda internalnya.
 */
export async function getDaftarMasukan(idPenghuni: string, limit = 30) {
  const rows = await db
    .select({
      id: feedback.id_feedback,
      category: feedback.category,
      deskripsi: feedback.deskripsi,
      status: feedback.status,
      reported_at: feedback.reported_at,
    })
    .from(feedback)
    .where(eq(feedback.id_penghuni, idPenghuni))
    .orderBy(desc(feedback.reported_at), desc(feedback.id_feedback))
    .limit(limit);

  return rows.map((r) => {
    const cocok = String(r.deskripsi ?? "").match(/^\[(\d{4}-\d{2}-\d{2})\] \[([^\]]+)\] ([\s\S]*)$/);
    return {
      id: r.id,
      category: r.category,
      jenis: cocok?.[2] ?? "Masukan",
      isi: cocok?.[3] ?? String(r.deskripsi ?? ""),
      status: r.status,
      tanggal: r.reported_at ?? cocok?.[1] ?? null,
    };
  });
}
