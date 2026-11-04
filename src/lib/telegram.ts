import "server-only";

const BATAS_TELEGRAM = 4096;

export function escapeHtml(teks: string): string {
  return teks.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * Kirim pesan ke chat pengelola lewat Telegram Bot API. Tidak pernah melempar:
 * notifikasi hanya pelengkap, kegagalannya tidak boleh membatalkan aksi penghuni.
 * `teks` adalah HTML Telegram; escape dulu isi dari pengguna dengan escapeHtml.
 */
export async function kirimTelegram(teks: string): Promise<{ ok: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diset, pesan dilewati.");
    return { ok: false };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: teks.slice(0, BATAS_TELEGRAM), parse_mode: "HTML" }),
    });
    if (!res.ok) {
      console.error(`[telegram] gagal (${res.status}):`, (await res.text()).slice(0, 200));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[telegram] error jaringan:", e);
    return { ok: false };
  }
}
