import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { buatDbUji } from "./helpers/db-uji";
import { occupancyHistory, trClaimCode } from "@/db/schema";

let uji: Awaited<ReturnType<typeof buatDbUji>>;
vi.mock("@/db", async () => {
  uji = await buatDbUji();
  return { db: uji.db };
});

let kk: typeof import("@/lib/kode-klaim");
beforeAll(async () => {
  await import("@/db");
  kk = await import("@/lib/kode-klaim");
});

const penghuni = (id: string) =>
  uji.db.insert(occupancyHistory).values({ id_penghuni: id, nama: id, no_kamar: "1", tanggal_mulai: "2026-01-01" });

describe("kode klaim", () => {
  it("format: 8 karakter dari alfabet tanpa karakter ambigu (I, O, 0, 1)", async () => {
    await penghuni("A");
    for (let i = 0; i < 20; i++) expect(await kk.buatKodeKlaim("A")).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it("kode benar bisa dipakai sekali saja", async () => {
    await penghuni("B");
    const kode = await kk.buatKodeKlaim("B");
    expect(await kk.pakaiKodeKlaim("B", kode)).toBe(true);
    expect(await kk.pakaiKodeKlaim("B", kode)).toBe(false);
  });

  it("kode salah ditolak dan tidak menghanguskan kode asli", async () => {
    await penghuni("C");
    const kode = await kk.buatKodeKlaim("C");
    expect(await kk.pakaiKodeKlaim("C", "SALAHSALAH")).toBe(false);
    expect(await kk.pakaiKodeKlaim("C", kode)).toBe(true);
  });

  it("kode milik penghuni lain tidak berlaku", async () => {
    await penghuni("D1");
    await penghuni("D2");
    const kode = await kk.buatKodeKlaim("D1");
    await kk.buatKodeKlaim("D2");
    expect(await kk.pakaiKodeKlaim("D2", kode)).toBe(false);
  });

  it("mengabaikan huruf besar/kecil, spasi, dan strip saat mengetik", async () => {
    await penghuni("E");
    const kode = await kk.buatKodeKlaim("E");
    const diketik = `${kode.slice(0, 4)}-${kode.slice(4)}`.toLowerCase();
    expect(await kk.pakaiKodeKlaim("E", ` ${diketik} `)).toBe(true);
  });

  it("kedaluwarsa setelah 30 hari", async () => {
    await penghuni("F");
    const kode = await kk.buatKodeKlaim("F");
    const hariKe31 = new Date(Date.now() + 31 * 86_400_000);
    expect(await kk.pakaiKodeKlaim("F", kode, uji.db, hariKe31)).toBe(false);
  });

  it("dua pemakaian paralel dengan kode benar: tepat satu yang berhasil", async () => {
    await penghuni("G");
    const kode = await kk.buatKodeKlaim("G");
    const hasil = await Promise.all([kk.pakaiKodeKlaim("G", kode), kk.pakaiKodeKlaim("G", kode)]);
    expect(hasil.filter(Boolean)).toHaveLength(1);
  });

  it("membuat kode baru menimpa kode lama, juga yang sudah terpakai", async () => {
    await penghuni("H");
    const lama = await kk.buatKodeKlaim("H");
    await kk.pakaiKodeKlaim("H", lama);
    const baru = await kk.buatKodeKlaim("H");
    expect(await kk.pakaiKodeKlaim("H", lama)).toBe(false);
    expect(await kk.pakaiKodeKlaim("H", baru)).toBe(true);
  });

  it("hanya menyimpan hash, bukan kode asli", async () => {
    await penghuni("I");
    const kode = await kk.buatKodeKlaim("I");
    const [baris] = await uji.db.select().from(trClaimCode).where(eq(trClaimCode.id_penghuni, "I"));
    expect(baris.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(baris)).not.toContain(kode);
  });
});
