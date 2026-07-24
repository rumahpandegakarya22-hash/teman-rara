import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { trInformationBoard } from "@/db/schema";
import { getPengumuman } from "@/lib/board";
import { kirimKeSemua } from "@/lib/push";
import { adalahPengelola } from "@/lib/role";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
  }

  try {
    const { limit, offset } = parsed.data;
    return NextResponse.json({ data: await getPengumuman(limit, offset), limit, offset });
  } catch {
    return NextResponse.json({ error: "Gagal memuat pengumuman" }, { status: 500 });
  }
}

const buatSchema = z.object({
  type: z.enum(["rule", "announcement"]).default("announcement"),
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(3).max(10_000),
});

/** Pengelola memasang pengumuman/peraturan baru; penghuni langsung dapat notifikasi. */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });
  if (!(await adalahPengelola())) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const parsed = buatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  try {
    const [baris] = await db
      .insert(trInformationBoard)
      .values({ ...parsed.data, created_by: userId, updated_by: userId })
      .returning({ id: trInformationBoard.id, title: trInformationBoard.title, type: trInformationBoard.type });

    void kirimKeSemua({
      title: baris.type === "rule" ? "Peraturan kost diperbarui" : "Pengumuman baru",
      body: baris.title,
      url: baris.type === "rule" ? "/" : `/pengumuman/${baris.id}`,
    }).catch(() => {});

    return NextResponse.json({ data: baris }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}
