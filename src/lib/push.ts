import "server-only";
import webpush from "web-push";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { trNotificationPreference, trPushSubscription } from "@/db/schema";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

const siap = Boolean(publicKey && privateKey);
if (siap) webpush.setVapidDetails(subject, publicKey!, privateKey!);

export type IsiNotifikasi = { title: string; body: string; url?: string };

const kolomLangganan = {
  endpoint: trPushSubscription.endpoint,
  p256dh: trPushSubscription.p256dh,
  auth: trPushSubscription.auth,
};

/** Kirim ke satu penghuni. Melewati yang mematikan notifikasi push. */
export async function kirimKePenghuni(idPenghuni: string, isi: IsiNotifikasi) {
  if (!siap) return { terkirim: 0, dilewati: "VAPID belum dikonfigurasi" };

  const [preferensi] = await db
    .select({ push_enabled: trNotificationPreference.push_enabled })
    .from(trNotificationPreference)
    .where(eq(trNotificationPreference.id_penghuni, idPenghuni))
    .limit(1);
  // Belum pernah mengatur berarti dianggap setuju (default kolom 1).
  if (preferensi && !preferensi.push_enabled) return { terkirim: 0, dilewati: "push dimatikan" };

  const langganan = await db
    .select(kolomLangganan)
    .from(trPushSubscription)
    .where(and(eq(trPushSubscription.id_penghuni, idPenghuni), isNull(trPushSubscription.deleted_at)));

  return kirimKeBanyak(langganan, isi);
}

/** Kirim ke semua langganan aktif. Dipakai untuk pengumuman papan informasi. */
export async function kirimKeSemua(isi: IsiNotifikasi) {
  if (!siap) return { terkirim: 0, dilewati: "VAPID belum dikonfigurasi" };

  const langganan = await db
    .select(kolomLangganan)
    .from(trPushSubscription)
    .where(isNull(trPushSubscription.deleted_at));

  return kirimKeBanyak(langganan, isi);
}

async function kirimKeBanyak(
  langganan: { endpoint: string; p256dh: string; auth: string }[],
  isi: IsiNotifikasi,
) {
  const payload = JSON.stringify(isi);
  const mati: string[] = [];

  const hasil = await Promise.allSettled(
    langganan.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        .catch((e: { statusCode?: number }) => {
          if (e.statusCode === 404 || e.statusCode === 410) mati.push(s.endpoint);
          throw e;
        }),
    ),
  );

  if (mati.length > 0) {
    await db
      .update(trPushSubscription)
      .set({ deleted_at: new Date().toISOString() })
      .where(inArray(trPushSubscription.endpoint, mati));
  }

  return { terkirim: hasil.filter((r) => r.status === "fulfilled").length, kedaluwarsa: mati.length };
}
