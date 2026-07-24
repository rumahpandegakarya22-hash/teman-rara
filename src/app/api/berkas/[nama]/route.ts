import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trComplainPhoto, trPaymentProof } from "@/db/schema";
import { ambilGambar } from "@/lib/storage";
import { getPenghuniAktif } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Menyajikan berkas Drive milik penghuni. Berkas di Drive tidak publik, jadi
 * route ini men-stream ulang HANYA setelah memastikan berkas itu milik penghuni
 * yang meminta. Param adalah Drive fileId.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ nama: string }> }) {
  const { nama: fileId } = await params;

  // Drive fileId: huruf, angka, dash, underscore. Tolak selain itu (anti-abuse).
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(fileId)) {
    return NextResponse.json({ error: "Berkas tidak valid" }, { status: 400 });
  }

  const penghuni = await getPenghuniAktif();
  if (!penghuni) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });

  const url = `/api/berkas/${fileId}`;
  const [bukti, foto] = await Promise.all([
    db
      .select({ id: trPaymentProof.id })
      .from(trPaymentProof)
      .where(and(eq(trPaymentProof.file_url, url), eq(trPaymentProof.id_penghuni, penghuni.id_penghuni)))
      .limit(1),
    db
      .select({ id: trComplainPhoto.id })
      .from(trComplainPhoto)
      .where(and(eq(trComplainPhoto.file_url, url), eq(trComplainPhoto.id_penghuni, penghuni.id_penghuni)))
      .limit(1),
  ]);

  if (bukti.length === 0 && foto.length === 0) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const { buffer, mime } = await ambilGambar(fileId);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 404 });
  }
}
