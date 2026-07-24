import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Hanya memasang konteks sesi Clerk. Proteksi sesungguhnya dilakukan di tiap
 * halaman/route (resource-based), sesuai anjuran Clerk Core 3 — pencocokan path
 * di proxy bisa meleset dari cara Next.js merutekan permintaan.
 */
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|sw\\.js|offline\\.html|.*\\.(?:png|webmanifest|ico|svg)$).*)", "/api/(.*)"],
};
