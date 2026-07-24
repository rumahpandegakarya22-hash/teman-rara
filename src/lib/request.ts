import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tenantComplain, trComplainPhoto } from "@/db/schema";

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
