import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { trPushSubscription } from "@/db/schema";
import { getPenghuniAktif } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(255), auth: z.string().min(1).max(255) }),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data langganan tidak valid" }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  try {
    // Tautkan ke penghuni bila sudah masuk, supaya notifikasi personal bisa dikirim.
    const penghuni = await getPenghuniAktif();
    const idPenghuni = penghuni?.id_penghuni ?? null;

    await db
      .insert(trPushSubscription)
      .values({ endpoint, p256dh: keys.p256dh, auth: keys.auth, id_penghuni: idPenghuni })
      .onConflictDoUpdate({
        target: trPushSubscription.endpoint,
        set: {
          p256dh: keys.p256dh,
          auth: keys.auth,
          id_penghuni: idPenghuni,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        },
      });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan langganan" }, { status: 500 });
  }
}
