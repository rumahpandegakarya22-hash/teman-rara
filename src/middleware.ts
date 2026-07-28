import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * SENGAJA masih pakai nama file lama `middleware.ts` (bukan `proxy.ts` ala
 * Next.js 16), dan runtime dipaksa edge di sini. Next.js 16 "Proxy" yang baru
 * cuma bisa jalan di Node.js runtime — dan OpenNext Cloudflare adapter
 * (per @opennextjs/cloudflare 1.20.2) belum bisa build Node.js middleware
 * (lihat opennextjs/opennextjs-cloudflare#962). Next.js 16.2.x masih mengenali
 * `middleware.ts` dengan edge runtime sebagai fallback. Hapus workaround ini
 * begitu OpenNext resmi dukung proxy.ts.
 *
 * Hanya memasang konteks sesi Clerk. Proteksi sesungguhnya dilakukan di tiap
 * halaman/route (resource-based), sesuai anjuran Clerk Core 3 — pencocokan path
 * di proxy bisa meleset dari cara Next.js merutekan permintaan.
 */
export const runtime = "experimental-edge";

export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|sw\\.js|offline\\.html|.*\\.(?:png|webmanifest|ico|svg)$).*)", "/api/(.*)"],
};
