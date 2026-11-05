import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // Aturan React Compiler baru di Next 16 yang menandai kode lama; diturunkan
    // ke warn supaya tidak memblokir CI. Rapikan bertahap.
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: [".next/**", ".open-next/**", "node_modules/**", "cron-worker/**", "graphify-out/**", "scripts/**", "public/sw.js", "next-env.d.ts", "cloudflare-env.d.ts"],
  },
];

export default config;
