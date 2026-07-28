import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // PDF peraturan internal berada di luar public/ agar tidak bisa diakses lewat
  // URL langsung. Sertakan foldernya saat build supaya tetap terbaca di server.
  outputFileTracingIncludes: {
    "/api/peraturan": ["./private/peraturan/**"],
  },
  // @libsql/client butuh binding WebSocket asli (bukan polyfill nodejs_compat)
  // saat jalan di Workers runtime.
  serverExternalPackages: ["@libsql/isomorphic-ws"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(), microphone=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
