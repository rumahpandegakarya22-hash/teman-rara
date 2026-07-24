import { NextResponse } from "next/server";
import { getPembaruanTerakhir } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ updated_at: await getPembaruanTerakhir() });
  } catch {
    return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
