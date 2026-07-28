import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Proteksi halaman: arahkan tamu ke halaman masuk (bukan 404), lalu kembalikan
 * mereka ke tujuan semula setelah berhasil masuk.
 */
export async function wajibMasuk(kembaliKe: string) {
  // Bypass login khusus dev lokal — syarat sama dengan getSesiPenghuni().
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "1") return "dev-bypass";

  const { userId } = await auth();
  if (!userId) redirect(`/masuk?redirect_url=${encodeURIComponent(kembaliKe)}`);
  return userId;
}
