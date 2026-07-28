import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Aplikasi ini semua route-nya dynamic (auth-gated, tidak ada ISR/SSG),
// jadi cache bawaan (in-memory per isolate) cukup — tidak perlu R2 bucket.
// Kalau nanti ada halaman pakai `export const revalidate`, tambah
// incrementalCache: r2IncrementalCache di sini + r2_buckets di wrangler.jsonc.
export default defineCloudflareConfig();
