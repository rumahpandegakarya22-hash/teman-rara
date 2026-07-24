import "server-only";
import { auth } from "@clerk/nextjs/server";

/**
 * Pengelola ditandai lewat publicMetadata `{ "role": "pengelola" }` di dashboard Clerk.
 * Dicek server-side setiap permintaan — metadata dari sesi tidak bisa diubah klien.
 */
export async function adalahPengelola() {
  const { sessionClaims } = await auth();
  const metadata = sessionClaims?.publicMetadata as { role?: string } | undefined;
  return metadata?.role === "pengelola";
}
