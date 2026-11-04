import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buatDbUji } from "./helpers/db-uji";
import { invoiceSewa, occupancyHistory } from "@/db/schema";

vi.mock("@/db", async () => {
  const t = await buatDbUji();
  return { db: t.db };
});
const kirim = vi.fn(async () => ({ terkirim: 1 }));
vi.mock("@/lib/push", () => ({ kirimKePenghuni: kirim }));

let db: typeof import("@/db").db;
let jobs: typeof import("@/lib/jobs");

async function tagihan(id: string, periode_akhir: string, tanggal_pembayaran?: string) {
  await db.insert(occupancyHistory).values({ id_penghuni: id, nama: id, no_kamar: "1", tanggal_mulai: "2026-01-01" });
  await db.insert(invoiceSewa).values({
    no_inv: `INV-${id}`, id_penghuni: id, nama: id, no_kamar: "1", periode_akhir, grand_total: 1_000_000, tanggal_pembayaran,
  });
}

describe("jalankanPengingatJatuhTempo", () => {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    ({ db } = await import("@/db"));
    jobs = await import("@/lib/jobs");
  });
  afterAll(() => vi.useRealTimers());
  beforeEach(() => kirim.mockClear());

  it("dua eksekusi paralel mengirim tepat satu notifikasi (guard idempoten)", async () => {
    vi.setSystemTime(new Date("2026-11-04T05:00:00Z"));
    await tagihan("A", "2026-11-07"); // H-3
    await Promise.all([jobs.jalankanPengingatJatuhTempo(), jobs.jalankanPengingatJatuhTempo()]);
    expect(kirim).toHaveBeenCalledTimes(1);
  });

  it("eksekusi ulang di hari yang sama tidak mengirim lagi", async () => {
    await jobs.jalankanPengingatJatuhTempo();
    expect(kirim).not.toHaveBeenCalled();
  });

  it("memakai hari WIB: pukul 01:00 WIB (18:00 UTC) tanggal 5, jatuh tempo tanggal 8 = H-3", async () => {
    vi.setSystemTime(new Date("2026-11-04T18:00:00Z"));
    await tagihan("B", "2026-11-08");
    await jobs.jalankanPengingatJatuhTempo();
    expect(kirim).toHaveBeenCalledTimes(1);
  });

  it("tagihan yang sudah dibayar tidak diingatkan", async () => {
    await tagihan("C", "2026-11-08", "2026-11-01");
    await jobs.jalankanPengingatJatuhTempo();
    expect(kirim).not.toHaveBeenCalled();
  });
});
