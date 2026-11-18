import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trFeedbackRutin } from "@/db/schema";
import { hariIniWIB } from "@/lib/waktu";

export async function sudahIsiFeedbackBulanIni(idPenghuni: string): Promise<boolean> {
  const [baris] = await db
    .select({ id: trFeedbackRutin.id_penghuni })
    .from(trFeedbackRutin)
    .where(and(eq(trFeedbackRutin.id_penghuni, idPenghuni), eq(trFeedbackRutin.periode, hariIniWIB().slice(0, 7))))
    .limit(1);
  return !!baris;
}
