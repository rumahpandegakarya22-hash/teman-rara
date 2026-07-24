import "server-only";
import { google } from "googleapis";

function createAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN belum diset."
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);

  auth.setCredentials({
    refresh_token: refreshToken,
  });

  return auth;
}

let auth: ReturnType<typeof createAuth> | null = null;

function getAuth() {
  if (!auth) {
    auth = createAuth();
  }

  return auth;
}

let drive: ReturnType<typeof google.drive> | null = null;

export function driveClient() {
  if (!drive) {
    drive = google.drive({
      version: "v3",
      auth: getAuth(),
    });
  }

  return drive;
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