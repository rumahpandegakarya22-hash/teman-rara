import { NextResponse } from "next/server";
import { kirimPdfDrive } from "@/lib/drive-pdf";
import { kontrakAktif, NAMA_KONTRAK } from "@/lib/kontrak";

export const dynamic = "force-dynamic";

// Publik (calon penghuni belum punya akun), tapi hanya hidup selagi fitur aktif.
export async function GET() {
  if (!(await kontrakAktif())) {
    return NextResponse.json({ error: "Tidak tersedia." }, { status: 404 });
  }
  const folderId = process.env.DRIVE_FOLDER_DOKUMEN_INTERNAL;
  if (!folderId) {
    console.error("[kontrak] DRIVE_FOLDER_DOKUMEN_INTERNAL belum diset.");
    return NextResponse.json({ error: "Layanan dokumen belum dikonfigurasi." }, { status: 503 });
  }
  return kirimPdfDrive(NAMA_KONTRAK, folderId, "kontrak");
}
