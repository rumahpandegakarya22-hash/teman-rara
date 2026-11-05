import { beforeAll, describe, expect, it, vi } from "vitest";
import { buatDbUji } from "./helpers/db-uji";

vi.mock("@/db", async () => {
  const t = await buatDbUji();
  return { db: t.db };
});

let rl: typeof import("@/lib/rate-limit");
beforeAll(async () => {
  rl = await import("@/lib/rate-limit");
});

describe("cobaPakai", () => {
  it("mengizinkan sampai batas lalu menolak", async () => {
    const hasil = [];
    for (let i = 0; i < 4; i++) hasil.push((await rl.cobaPakai("a", 3, 60, 1_000)).ok);
    expect(hasil).toEqual([true, true, true, false]);
  });

  it("melaporkan sisa kuota", async () => {
    expect((await rl.cobaPakai("sisa", 3, 60, 1_000)).sisa).toBe(2);
  });

  it("kunci berbeda tidak saling memengaruhi", async () => {
    for (let i = 0; i < 5; i++) await rl.cobaPakai("x", 1, 60, 1_000);
    expect((await rl.cobaPakai("y", 1, 60, 1_000)).ok).toBe(true);
  });

  it("jendela berikutnya mulai dari nol", async () => {
    for (let i = 0; i < 3; i++) await rl.cobaPakai("w", 1, 60, 1_000);
    expect((await rl.cobaPakai("w", 1, 60, 1_000)).ok).toBe(false);
    expect((await rl.cobaPakai("w", 1, 60, 61_000)).ok).toBe(true);
  });

  it("atomik: 10 panggilan paralel dengan batas 5 meloloskan tepat 5", async () => {
    const hasil = await Promise.all(Array.from({ length: 10 }, () => rl.cobaPakai("par", 5, 60, 1_000)));
    expect(hasil.filter((h) => h.ok)).toHaveLength(5);
  });
});

describe("bersihkanRateLimit", () => {
  it("menghapus jendela lama dan mempertahankan yang baru", async () => {
    await rl.cobaPakai("lama", 5, 60, 0);
    await rl.cobaPakai("baru", 5, 60, 200_000_000);
    const dihapus = await rl.bersihkanRateLimit(200_000_000, 86_400);
    expect(dihapus).toBeGreaterThanOrEqual(1);
    expect((await rl.cobaPakai("baru", 5, 60, 200_000_000)).sisa).toBe(3);
  });
});
