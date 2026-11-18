import { NextRequest, NextResponse } from "next/server";
import { dokumenInternalValid } from "@/lib/dokumen";
import { kirimPdfDrive } from "@/lib/drive-pdf";
import { getSesiPenghuni } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ nama: string }> }) {
  const { nama } = await params;
  if (!dokumenInternalValid(nama)) {
    return NextResponse.json({ error: "Dokumen tidak dikenal." }, { status: 404 });
  }

  // Dokumen internal hanya untuk penghuni aktif, bukan sekadar akun Clerk
  // (pendaftaran Clerk terbuka untuk umum).
  const sesi = await getSesiPenghuni();
  if (sesi.status === "tamu") return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  if (sesi.status !== "aktif") return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });

  const folderId = process.env.DRIVE_FOLDER_DOKUMEN_INTERNAL;
  if (!folderId) {
    console.error("[dokumen] DRIVE_FOLDER_DOKUMEN_INTERNAL belum diset.");
    return NextResponse.json({ error: "Layanan dokumen belum dikonfigurasi." }, { status: 503 });
  }

  return kirimPdfDrive(nama, folderId, "dokumen");
}
