import { NextResponse } from "next/server";
import { z } from "zod";
import { getPengumumanById } from "@/lib/board";
import { db } from "@/db";
import { trInformationBoard } from "@/db/schema";
import { eq } from "drizzle-orm";
import { kirimKeSemua } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Kirim push untuk satu entri papan informasi.
 *
 * Pengumuman & peraturan sekarang dikelola dari Mini Apps Ops (dashboard
 * pengelola), yang menulis langsung ke tabel `tr_information_board` di database
 * yang sama. Yang TIDAK bisa dilakukan dari sana adalah mengirim push: kunci
 * VAPID dan daftar langganan hanya hidup di aplikasi ini. Jadi Ops menulis
 * datanya, lalu memanggil endpoint ini untuk pengirimannya.
 *
 * Auth memakai shared secret, bukan sesi Clerk: kedua aplikasi memakai instance
 * Clerk yang BERBEDA, sehingga cookie sesi Ops tidak akan pernah lolos di sini.
 * Polanya sama dengan CRON_SECRET — endpoint publik secara jaringan, dijaga
 * header rahasia, dan tidak boleh bergantung pada sesi.
 */

const schema = z.object({ id: z.uuid() });

export async function POST(request: Request) {
  const rahasia = process.env.OPS_SHARED_SECRET;
  if (!rahasia || request.headers.get("authorization") !== `Bearer ${rahasia}`) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  try {
    // Peraturan tidak punya halaman detail sendiri, jadi dicari terpisah dan
    // notifikasinya mengarah ke beranda.
    const pengumuman = await getPengumumanById(parsed.data.id);
    const [entri] = pengumuman
      ? [{ ...pengumuman, type: "announcement" as const }]
      : await db
          .select({ id: trInformationBoard.id, title: trInformationBoard.title, type: trInformationBoard.type })
          .from(trInformationBoard)
          .where(eq(trInformationBoard.id, parsed.data.id))
          .limit(1);

    if (!entri) return NextResponse.json({ error: "Entri tidak ditemukan" }, { status: 404 });

    const hasil = await kirimKeSemua({
      title: entri.type === "rule" ? "Peraturan kost diperbarui" : "Pengumuman baru",
      body: entri.title,
      url: entri.type === "rule" ? "/" : `/pengumuman/${entri.id}`,
    });

    return NextResponse.json({ data: hasil });
  } catch {
    return NextResponse.json({ error: "Gagal mengirim notifikasi" }, { status: 500 });
  }
}
