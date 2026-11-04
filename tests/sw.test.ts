import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type Handler = (e: Record<string, unknown>) => void;

function muatSw(opsi: { online: boolean; cacheAwal?: Record<string, string[]> }) {
  const handlers: Record<string, Handler> = {};
  const toko = new Map<string, Map<string, Response>>();
  for (const [nama, urls] of Object.entries(opsi.cacheAwal ?? {})) {
    toko.set(nama, new Map(urls.map((u) => [u, new Response(`cache:${u}`)])));
  }
  const puts: string[] = [];
  const buka = (nama: string) => {
    if (!toko.has(nama)) toko.set(nama, new Map());
    const m = toko.get(nama)!;
    return Promise.resolve({
      addAll: async () => {},
      put: async (req: { url: string } | string) => {
        const u = typeof req === "string" ? req : req.url;
        puts.push(u);
        m.set(u, new Response("x"));
      },
    });
  };
  const caches = {
    open: buka,
    keys: async () => [...toko.keys()],
    delete: async (n: string) => toko.delete(n),
    match: async (req: { url: string } | string) => {
      const u = typeof req === "string" ? req : req.url;
      for (const m of toko.values()) {
        for (const [k, v] of m) if (k === u || k.endsWith(u)) return v;
      }
      return undefined;
    },
  };
  const self = {
    addEventListener: (t: string, fn: Handler) => (handlers[t] = fn),
    location: { origin: "http://x" },
    skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => [] },
    registration: {},
  };
  const sandbox = {
    self, caches, URL, Response,
    fetch: async () => {
      if (!opsi.online) throw new Error("offline");
      return new Response("jaringan");
    },
  };
  const kode = readFileSync(path.resolve(__dirname, "../public/sw.js"), "utf8");
  vm.runInNewContext(kode, sandbox);
  return { handlers, toko, puts, caches };
}

async function navigasi(handlers: Record<string, Handler>, url: string) {
  let hasil: Promise<Response> | undefined;
  handlers.fetch({
    request: { method: "GET", url, mode: "navigate" },
    respondWith: (p: Promise<Response>) => (hasil = p),
  });
  const res = await hasil!;
  await new Promise((r) => setTimeout(r, 0));
  return res;
}

describe("service worker", () => {
  it("tidak menyimpan halaman privat ke cache saat online", async () => {
    const sw = muatSw({ online: true });
    await navigasi(sw.handlers, "http://x/kamar");
    expect(sw.puts).toEqual([]);
  });

  it("menyimpan beranda publik ke cache saat online", async () => {
    const sw = muatSw({ online: true });
    await navigasi(sw.handlers, "http://x/");
    expect(sw.puts).toEqual(["http://x/"]);
  });

  it("offline: halaman privat tidak dilayani dari cache, jatuh ke offline.html", async () => {
    const sw = muatSw({
      online: false,
      cacheAwal: { "teman-rara-v2": ["http://x/kamar", "/offline.html"] },
    });
    const res = await navigasi(sw.handlers, "http://x/kamar");
    expect(await res.text()).toBe("cache:/offline.html");
  });

  it("activate menghapus cache versi lama (v1 yang berisi halaman privat)", async () => {
    const sw = muatSw({ online: true, cacheAwal: { "teman-rara-v1": ["http://x/kamar"], "teman-rara-v2": [] } });
    let selesai: Promise<unknown> | undefined;
    sw.handlers.activate({ waitUntil: (p: Promise<unknown>) => (selesai = p) });
    await selesai;
    expect([...sw.toko.keys()]).toEqual(["teman-rara-v2"]);
  });
});
