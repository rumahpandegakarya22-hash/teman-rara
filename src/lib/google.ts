import "server-only";

/**
 * Kredensial Google Drive via OAuth 2.0 refresh token — memakai `fetch` native,
 * BUKAN library `googleapis`.
 *
 * Alasan: Teman Rara jalan di Cloudflare Workers. Library googleapis memakai
 * `node:http` yang tidak lengkap di runtime Workers (unenv): `validateHeaderName`
 * tidak diimplementasikan, dan respons ter-gzip gagal di-decompress. Keduanya
 * membuat setiap panggilan Drive lewat library itu gagal di produksi. `fetch`
 * bawaan Workers menangani TLS + gzip sendiri, jadi jalur ini bebas dari masalah
 * tersebut sekaligus memangkas dependensi.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function driveSiap(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

// Access token di-cache di memori sampai sesaat sebelum kedaluwarsa. Worker bisa
// dibekukan/diganti kapan saja, jadi ini best-effort — bukan sumber kebenaran.
let cache: { token: string; kedaluwarsa: number } | null = null;

/** Tukar refresh token jadi access token. Dipakai semua panggilan Drive. */
export async function getAccessToken(): Promise<string> {
  if (cache && cache.kedaluwarsa > Date.now()) return cache.token;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN belum diset.");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Gagal refresh token Google: ${data.error ?? res.status} ${data.error_description ?? ""}`.trim(),
    );
  }

  cache = {
    token: data.access_token,
    kedaluwarsa: Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000,
  };
  return cache.token;
}

/** Retry backoff untuk error kuota/transien Google API (429/500/503). */
export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      const code = (e as { status?: number }).status;
      if (code === 429 || code === 500 || code === 503) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** i));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}
