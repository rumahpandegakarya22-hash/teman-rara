import { NextResponse } from "next/server";
import { z } from "zod";
import { getPengumumanById } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const data = await getPengumumanById(id);
    if (!data) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Gagal memuat pengumuman" }, { status: 500 });
  }
}
