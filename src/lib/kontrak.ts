import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appConfig } from "@/db/schema";

/** Nama berkas di folder Drive dokumen internal (`kontrak-sewa.pdf`). */
export const NAMA_KONTRAK = "kontrak-sewa";
/** Naikkan saat PDF kontrak di Drive diganti, supaya persetujuan lama tetap tercatat versinya. */
export const KONTRAK_VERSI = "v1";

/** Saklar diatur pengelola di Mini App Ops (app_config.kontrak_enabled). Baris tidak ada = mati. */
export async function kontrakAktif(): Promise<boolean> {
  const [baris] = await db
    .select({ value: appConfig.value })
    .from(appConfig)
    .where(eq(appConfig.key, "kontrak_enabled"));
  return baris?.value === "1";
}
