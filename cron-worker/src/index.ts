interface Env {
  CRON_TARGET_URL: string;
  CRON_SECRET: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

/**
 * Cloudflare Pages tidak punya cron trigger native (fitur itu cuma ada di
 * Workers). Worker terpisah ini menggantikan `crons` di vercel.json: dipicu
 * Cloudflare Cron Trigger, lalu tinggal memanggil endpoint /api/cron/harian
 * yang sudah ada di aplikasi Next.js, dengan header yang sama seperti dulu.
 */
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(panggilCronHarian(env, event.scheduledTime));
  },
};

async function panggilCronHarian(env: Env, waktuMs: number) {
  let pesan: string | null = null;
  // Status 500 = aplikasi sendiri sudah mengirim peringatan Telegram (job gagal).
  // Selain itu (401, 502, aplikasi mati, jaringan) hanya worker ini yang tahu.
  let appSudahMemberitahu = false;

  try {
    const res = await fetch(env.CRON_TARGET_URL, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    if (!res.ok) {
      pesan = `Cron harian gagal (${res.status}): ${await res.text()}`;
      appSudahMemberitahu = res.status === 500;
    }
  } catch (e) {
    pesan = `Cron harian tidak bisa menghubungi aplikasi: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (!pesan) return;
  console.error(pesan);

  // Cron jalan tiap 15 menit; peringatan dibatasi satu per jam (menit 0-14).
  if (!appSudahMemberitahu && new Date(waktuMs).getUTCMinutes() < 15) {
    await kirimTelegram(env, `<b>Cron Teman Rara gagal</b>\n${pesan.slice(0, 300).replaceAll("<", "&lt;")}`);
  }
  // Dilempar supaya invocation tercatat gagal di Cloudflare, bukan sukses semu.
  throw new Error(pesan);
}

async function kirimTelegram(env: Env, teks: string) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: teks, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("Peringatan Telegram gagal terkirim:", e);
  }
}
