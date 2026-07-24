import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Proteksi halaman: arahkan tamu ke halaman masuk (bukan 404), lalu kembalikan
 * mereka ke tujuan semula setelah berhasil masuk.
 */
export async function wajibMasuk(kembaliKe: string) {
  const { userId } = await auth();
  if (!userId) redirect(`/masuk?redirect_url=${encodeURIComponent(kembaliKe)}`);
  return userId;
}
