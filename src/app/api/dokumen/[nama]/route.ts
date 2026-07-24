import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dokumenInternalValid } from "@/lib/dokumen";

export const dynamic = "force-dynamic";

/** Dokumen internal: hanya untuk penghuni yang sudah masuk. */
export async function GET(_req: Request, { params }: { params: Promise<{ nama: string }> }) {
  const { nama } = await params;
  if (!dokumenInternalValid(nama)) {
    return NextResponse.json({ error: "Dokumen tidak dikenal" }, { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  try {
    const isi = await readFile(path.join(process.cwd(), "private", "peraturan", `${nama}.pdf`));
    return new NextResponse(new Uint8Array(isi), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nama}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Berkas belum tersedia" }, { status: 404 });
  }
}
