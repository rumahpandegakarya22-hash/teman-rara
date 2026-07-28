interface Env {
  CRON_TARGET_URL: string;
  CRON_SECRET: string;
}

/**
 * Cloudflare Pages tidak punya cron trigger native (fitur itu cuma ada di
 * Workers). Worker terpisah ini menggantikan `crons` di vercel.json: dipicu
 * Cloudflare Cron Trigger, lalu tinggal memanggil endpoint /api/cron/harian
 * yang sudah ada di aplikasi Next.js, dengan header yang sama seperti dulu.
 */
export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(panggilCronHarian(env));
  },
};

async function panggilCronHarian(env: Env) {
  const res = await fetch(env.CRON_TARGET_URL, {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });

  if (!res.ok) {
    console.error(`Cron harian gagal (${res.status}): ${await res.text()}`);
  }
}
