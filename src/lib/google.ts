import "server-only";
import { auth as googleAuth, drive } from "@googleapis/drive";

/**
 * Pakai `@googleapis/drive` (paket per-API), BUKAN `googleapis` — paket
 * umbrella itu membundel ~250 Google API client sekaligus (~46 MB), lewat
 * batas ukuran Worker Cloudflare (3 MB free / 10 MB paid) padahal cuma Drive
 * yang dipakai di sini.
 */

function createAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN belum diset."
    );
  }

  const client = new googleAuth.OAuth2(clientId, clientSecret);

  client.setCredentials({
    refresh_token: refreshToken,
  });

  return client;
}

let auth: ReturnType<typeof createAuth> | null = null;

function getAuth() {
  if (!auth) {
    auth = createAuth();
  }

  return auth;
}

let driveInstance: ReturnType<typeof drive> | null = null;

export function driveClient() {
  if (!driveInstance) {
    driveInstance = drive({
      version: "v3",
      auth: getAuth(),
    });
  }

  return driveInstance;
}

export function driveSiap(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
}

/** Retry backoff untuk error kuota/transien Google API (429/500/503). */
export async function withRetry<T>(
  fn: () => Promise<T>,
  tries = 3
): Promise<T> {
  let lastErr: unknown;

  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;

      const code =
        (e as { code?: number; response?: { status?: number } }).code ??
        (e as { response?: { status?: number } }).response?.status;

      if (code === 429 || code === 500 || code === 503) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * 2 ** i)
        );
        continue;
      }

      throw e;
    }
  }

  throw lastErr;
}