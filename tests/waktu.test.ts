import { describe, expect, it } from "vitest";
import { hariIniWIB, selisihHari, tambahHari } from "@/lib/waktu";

describe("waktu WIB", () => {
  it("hariIniWIB: sebelum 17:00 UTC masih hari yang sama", () => {
    expect(hariIniWIB(new Date("2026-11-04T16:59:00Z"))).toBe("2026-11-04");
  });
  it("hariIniWIB: mulai 17:00 UTC sudah hari berikutnya di WIB", () => {
    expect(hariIniWIB(new Date("2026-11-04T17:00:00Z"))).toBe("2026-11-05");
  });
  it("selisihHari: positif ke depan, negatif ke belakang", () => {
    expect(selisihHari("2026-11-04", "2026-11-11")).toBe(7);
    expect(selisihHari("2026-11-11", "2026-11-04")).toBe(-7);
  });
  it("tambahHari: melewati pergantian tahun", () => {
    expect(tambahHari("2026-12-31", 1)).toBe("2027-01-01");
  });
});
