import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDaftarPengaduan } from "@/lib/request";
import { getPenghuniAktif } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  try {
    const penghuni = await getPenghuniAktif();
    if (!penghuni) return NextResponse.json({ error: "Belum terhubung ke kamar" }, { status: 404 });
    return NextResponse.json({ data: await getDaftarPengaduan(penghuni.id_penghuni) });
  } catch {
    return NextResponse.json({ error: "Gagal memuat pengaduan" }, { status: 500 });
  }
}
