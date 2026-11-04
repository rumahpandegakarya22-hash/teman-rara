import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buatDbUji } from "./helpers/db-uji";
import { invoiceSewa, occupancyHistory, payment } from "@/db/schema";

let uji: Awaited<ReturnType<typeof buatDbUji>>;
vi.mock("@/db", async () => {
  uji = await buatDbUji();
  return { db: uji.db };
});

let tenant: typeof import("@/lib/tenant");

async function penghuni(id: string) {
  await uji.db.insert(occupancyHistory).values({ id_penghuni: id, nama: id, no_kamar: "1", tanggal_mulai: "2026-01-01" });
}
async function invoice(id_penghuni: string, v: { no_inv: string; periode_akhir: string; grand_total: number; tanggal_pembayaran?: string }) {
  const [r] = await uji.db
    .insert(invoiceSewa)
    .values({ id_penghuni, nama: id_penghuni, no_kamar: "1", ...v })
    .returning({ id: invoiceSewa.id });
  return r.id;
}
async function bayar(id_penghuni: string, invoice_sewa_id: number, amount: number, status: "Paid" | "Pending" | "Cancelled") {
  await uji.db.insert(payment).values({
    id_payment: crypto.randomUUID(), id_penghuni, invoice_sewa_id, amount, status,
  });
}

describe("tagihan", () => {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-04T05:00:00Z")); // 12:00 WIB
    await import("@/db");
    tenant = await import("@/lib/tenant");
  });
  afterAll(() => vi.useRealTimers());

  it("lunas bila tanggal_pembayaran terisi", async () => {
    await penghuni("L1");
    await invoice("L1", { no_inv: "I1", periode_akhir: "2026-11-30", grand_total: 1_000_000, tanggal_pembayaran: "2026-11-01" });
    expect((await tenant.getTagihanTerbaru("L1"))?.status).toBe("lunas");
  });

  it("sebagian: menghitung dibayar dan sisa dari payment Paid saja", async () => {
    await penghuni("S1");
    const id = await invoice("S1", { no_inv: "I2", periode_akhir: "2026-11-30", grand_total: 1_000_000 });
    await bayar("S1", id, 400_000, "Paid");
    await bayar("S1", id, 300_000, "Pending");
    await bayar("S1", id, 200_000, "Cancelled");
    const t = await tenant.getTagihanTerbaru("S1");
    expect(t).toMatchObject({ status: "sebagian", dibayar: 400_000, sisa: 600_000 });
  });

  it("nunggak bila lewat jatuh tempo berdasarkan hari WIB", async () => {
    await penghuni("N1");
    await invoice("N1", { no_inv: "I3", periode_akhir: "2026-11-03", grand_total: 500_000 });
    expect((await tenant.getTagihanTerbaru("N1"))?.status).toBe("nunggak");
  });

  it("invoice lama belum lunas muncul sebagai tunggakan, bukan sebagai tagihan terbaru", async () => {
    await penghuni("D1");
    await invoice("D1", { no_inv: "OLD", periode_akhir: "2026-09-30", grand_total: 900_000 });
    await invoice("D1", { no_inv: "NEW", periode_akhir: "2026-12-31", grand_total: 900_000 });
    expect((await tenant.getTagihanTerbaru("D1"))?.no_inv).toBe("NEW");
    const lama = await tenant.getTunggakanLama("D1");
    expect(lama.map((x) => x.no_inv)).toEqual(["OLD"]);
    expect(lama[0].sisa).toBe(900_000);
  });

  it("tunggakan lama yang sudah dibayar penuh tidak ikut", async () => {
    await penghuni("D2");
    const lama = await invoice("D2", { no_inv: "OLD2", periode_akhir: "2026-09-30", grand_total: 800_000 });
    await bayar("D2", lama, 800_000, "Paid");
    await invoice("D2", { no_inv: "NEW2", periode_akhir: "2026-12-31", grand_total: 800_000 });
    expect(await tenant.getTunggakanLama("D2")).toEqual([]);
  });
});
