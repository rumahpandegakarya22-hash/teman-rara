/**
 * IP klien dari header Cloudflare. `x-forwarded-for` sengaja tidak dipakai: bisa
 * dipalsukan klien. Tanpa header (dev lokal) semua pemanggil berbagi satu bucket.
 */
export function ambilIp(h: Headers): string {
  return h.get("cf-connecting-ip")?.trim() || "tak-dikenal";
}
