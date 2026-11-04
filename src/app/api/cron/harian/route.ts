import { NextResponse } from "next/server";
import { cocokSecret } from "@/lib/cron-auth";
import { jalankanPengingatJatuhTempo, sinkronStatusPengaduan } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/**
 * Menjalankan semua job terjadwal. Nama path "harian" peninggalan Vercel; kini
 * dipanggil tiap 15 menit oleh cron-worker, jadi semua job harus idempoten.
 * Endpoint ini publik secara jaringan, jadi diamankan dengan CRON_SECRET dan
 * tidak boleh mengandalkan sesi.
 */
export async function GET(request: Request) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia || !cocokSecret(request.headers.get("authorization"), `Bearer ${rahasia}`)) {
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
