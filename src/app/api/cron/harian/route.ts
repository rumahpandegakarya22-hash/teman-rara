import { NextResponse } from "next/server";
import { jalankanPengingatJatuhTempo, sinkronStatusPengaduan } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/**
 * Satu cron harian yang menjalankan semua job terjadwal.
 *
 * Digabung jadi satu karena paket Vercel Hobby hanya mengizinkan cron sekali
 * sehari per proyek. Endpoint ini publik secara jaringan, jadi diamankan
 * dengan CRON_SECRET dan tidak boleh mengandalkan sesi.
 */
export async function GET(request: Request) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia || request.headers.get("authorization") !== `Bearer ${rahasia}`) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  // Satu job gagal tidak boleh membatalkan job lain.
  const [tagihan, pengaduan] = await Promise.allSettled([
    jalankanPengingatJatuhTempo(),
    sinkronStatusPengaduan(),
  ]);

  const hasil = {
    pengingat_jatuh_tempo:
      tagihan.status === "fulfilled" ? tagihan.value : { error: "gagal" },
    sinkron_pengaduan:
      pengaduan.status === "fulfilled" ? pengaduan.value : { error: "gagal" },
  };

  const adaGagal = tagihan.status === "rejected" || pengaduan.status === "rejected";
  return NextResponse.json(hasil, { status: adaGagal ? 500 : 200 });
}
