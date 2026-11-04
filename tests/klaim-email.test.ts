import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { buatDbUji } from "./helpers/db-uji";
import { activeTenant, kamar, occupancyHistory } from "@/db/schema";

let uji: Awaited<ReturnType<typeof buatDbUji>>;
vi.mock("@/db", async () => {
  uji = await buatDbUji();
  return { db: uji.db };
});

async function tambahPenghuni(id: string, noKamar: number, email: string | null) {
  await uji.db.insert(kamar).values({ id_kamar: `K${noKamar}`, no_kamar: noKamar });
  await uji.db.insert(occupancyHistory).values({
    id_penghuni: id, nama: `Nama ${id}`, no_kamar: String(noKamar), tanggal_mulai: "2026-01-01",
  });
  await uji.db.insert(activeTenant).values({
    kamar_id: `K${noKamar}`, id_penghuni: id, nama_lengkap: `Nama ${id}`, no_kamar: String(noKamar), email,
  });
}
const emailDari = async (id: string) =>
  (await uji.db.select({ e: activeTenant.email }).from(activeTenant).where(eq(activeTenant.id_penghuni, id)))[0].e;

describe("isiEmailKosong", () => {
  let isiEmailKosong: typeof import("@/lib/tenant-write").isiEmailKosong;
  beforeAll(async () => {
    await import("@/db");
    ({ isiEmailKosong } = await import("@/lib/tenant-write"));
    await tambahPenghuni("P1", 1, null);
    await tambahPenghuni("P2", 2, "lama@x.com");
    await tambahPenghuni("P3", 3, "");
  });

  it("mengisi email yang NULL", async () => {
    expect(await isiEmailKosong("P1", "baru@x.com")).toBe(true);
    expect(await emailDari("P1")).toBe("baru@x.com");
  });
  it("tidak menimpa email yang sudah ada", async () => {
    expect(await isiEmailKosong("P2", "baru@x.com")).toBe(false);
    expect(await emailDari("P2")).toBe("lama@x.com");
  });
  it("menganggap string kosong sebagai kosong", async () => {
    expect(await isiEmailKosong("P3", "tiga@x.com")).toBe(true);
    expect(await emailDari("P3")).toBe("tiga@x.com");
  });
  it("tidak melempar error bila email sudah dipakai penghuni lain (kolom UNIQUE)", async () => {
    await tambahPenghuni("P4", 4, null);
    expect(await isiEmailKosong("P4", "lama@x.com")).toBe(false);
    expect(await emailDari("P4")).toBeNull();
  });
});
