import "server-only";
import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/google";

// ID file di-cache per instance Worker: ID tidak berubah selama file tidak
// dihapus-ulang, jadi listing API cukup sekali per instance.
const fileIdCache = new Map<string, string>();

async function cariFileId(nama: string, folderId: string, token: string): Promise<string | null> {
  const kunci = `${folderId}/${nama}`;
  const cached = fileIdCache.get(kunci);
  if (cached) return cached;

  const q = encodeURIComponent(`name='${nama}.pdf' and '${folderId}' in parents and trashed=false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { files?: { id: string }[] };
  const id = data.files?.[0]?.id ?? null;
  if (id) fileIdCache.set(kunci, id);
  return id;
}

/** Stream `<nama>.pdf` dari folder Drive sebagai respons inline. `nama` harus sudah di-whitelist pemanggil. */
export async function kirimPdfDrive(nama: string, folderId: string, logTag: string): Promise<NextResponse> {
  try {
    const token = await getAccessToken();
    const fileId = await cariFileId(nama, folderId, token);
    if (!fileId) return NextResponse.json({ error: "Berkas belum tersedia." }, { status: 404 });

    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!fileRes.ok) {
      console.error(`[${logTag}] Drive gagal kirim berkas:`, fileRes.status, nama);
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
    console.error(`[${logTag}] error:`, e);
    return NextResponse.json({ error: "Berkas tidak bisa diambil saat ini." }, { status: 502 });
  }
}
