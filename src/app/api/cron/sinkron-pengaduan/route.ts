import { NextResponse } from "next/server";
import { eq, isNull, or, ne, and } from "drizzle-orm";
import { db } from "@/db";
import { tenantComplain, trComplainSync } from "@/db/schema";
import { normalisasiStatus } from "@/lib/kategori";
import { kirimKePenghuni } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Deteksi perubahan status pengaduan yang dilakukan pengelola di dashboard
 * existing. Tabel tenant_complain tidak punya kolom updated_at dan strukturnya
 * tidak boleh diubah, jadi perubahan dikenali dengan membandingkan status
 * sekarang terhadap status terakhir yang tercatat di tr_complain_sync.
 */
export async function GET(request: Request) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia || request.headers.get("authorization") !== `Bearer ${rahasia}`) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  try {
    // Baris tanpa pasangan di sync adalah pengaduan yang dibuat lewat dashboard
    // (bukan lewat Teman Rara). Dicatat tanpa notifikasi, supaya perubahan
    // berikutnya saja yang memicu push.
    const berubah = await db
      .select({
        id_complain: tenantComplain.id_complain,
        id_penghuni: tenantComplain.id_penghuni,
        title: tenantComplain.title,
        status: tenantComplain.status,
        last_status: trComplainSync.last_status,
      })
      .from(tenantComplain)
      .leftJoin(trComplainSync, eq(trComplainSync.id_complain, tenantComplain.id_complain))
      .where(
        or(
          isNull(trComplainSync.id_complain),
          and(ne(trComplainSync.last_status, tenantComplain.status)),
        ),
      );

    let notifikasi = 0;
    let baru = 0;
    const sekarang = new Date().toISOString();

    for (const row of berubah) {
      const pertamaKali = row.last_status === null;
      const statusBaku = normalisasiStatus(row.status);

      if (!pertamaKali && normalisasiStatus(row.last_status) !== statusBaku) {
        const hasil = await kirimKePenghuni(row.id_penghuni, {
          title: `Pengaduan ${statusBaku}`,
          body: row.title,
          url: `/pengaduan/${row.id_complain}`,
        });
        notifikasi += hasil.terkirim;
      }
      if (pertamaKali) baru++;

      await db
        .insert(trComplainSync)
        .values({
          id_complain: row.id_complain,
          last_status: row.status,
          last_notified_at: pertamaKali ? null : sekarang,
        })
        .onConflictDoUpdate({
          target: trComplainSync.id_complain,
          set: { last_status: row.status, last_notified_at: sekarang, updated_at: sekarang },
        });
    }

    return NextResponse.json({
      diperiksa: berubah.length,
      pertama_kali_dicatat: baru,
      notifikasi_terkirim: notifikasi,
    });
  } catch {
    return NextResponse.json({ error: "Gagal menyinkronkan status" }, { status: 500 });
  }
}
