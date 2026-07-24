import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPenghuniAktif, getRiwayatBukti, getTagihanTerbaru } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  try {
    const penghuni = await getPenghuniAktif();
    if (!penghuni) {
      return NextResponse.json({ error: "Belum terhubung ke kamar" }, { status: 404 });
    }

    const [tagihan, riwayat] = await Promise.all([
      getTagihanTerbaru(penghuni.id_penghuni),
      getRiwayatBukti(penghuni.id_penghuni),
    ]);

    return NextResponse.json({
      penghuni: {
        nama: penghuni.nama,
        no_kamar: penghuni.no_kamar,
        tipe_kamar: penghuni.tipe_kamar,
        harga_bulan: penghuni.harga_bulan,
        fasilitas: penghuni.fasilitas,
        wifi_ssid: penghuni.wifi_ssid,
        wifi_password: penghuni.wifi_password,
      },
      tagihan,
      riwayat_bukti: riwayat,
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat dasbor" }, { status: 500 });
  }
}
