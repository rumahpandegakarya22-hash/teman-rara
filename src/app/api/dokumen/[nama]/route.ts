import { NextRequest, NextResponse } from "next/server";
import { dokumenInternalValid } from "@/lib/dokumen";
import { getAccessToken } from "@/lib/google";
import { getSesiPenghuni } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// File ID di-cache di memori Worker per instance — ID tidak berubah selama file
// tidak dihapus-ulang, jadi cache ini aman dan menghilangkan overhead listing API
// pada request berikutnya setelah instance "hangat".
const fileIdCache = new Map<string, string>();

async function cariFileId(nama: string, folderId: string, token: string): Promise<string | null> {
  const cached = fileIdCache.get(nama);
  if (cached) return cached;

  const q = encodeURIComponent(
    `name='${nama}.pdf' and '${folderId}' in parents and trashed=false`,
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { files?: { id: string }[] };
  const id = data.files?.[0]?.id ?? null;
  if (id) fileIdCache.set(nama, id);
  return id;
}

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

  try {
    const token = await getAccessToken();
    const fileId = await cariFileId(nama, folderId, token);

    if (!fileId) {
      return NextResponse.json({ error: "Berkas belum tersedia." }, { status: 404 });
    }

    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!fileRes.ok) {
      console.error("[dokumen] Drive gagal kirim berkas:", fileRes.status, nama);
      return NextResponse.json({ error: "Berkas tidak bisa diambil dari penyimpanan." }, { status: 502 });
    }

    return new NextResponse(fileRes.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nama}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e: unknown) {
    console.error("[dokumen] error:", e);
    return NextResponse.json({ error: "Berkas tidak bisa diambil saat ini." }, { status: 502 });
  }
}
