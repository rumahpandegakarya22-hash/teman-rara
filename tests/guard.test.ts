import { describe, expect, it } from "vitest";
import { izinTulis } from "../scripts/_guard.mjs";

describe("izinTulis", () => {
  it("mengizinkan DB file lokal", () => {
    expect(izinTulis("file:local.db", [])).toBe(true);
  });
  it("menolak Turso tanpa flag, termasuk saat URL kosong", () => {
    expect(izinTulis("libsql://x.turso.io", [])).toBe(false);
    expect(izinTulis(undefined, [])).toBe(false);
  });
  it("mengizinkan Turso bila ada --ya-ini-produksi", () => {
    expect(izinTulis("libsql://x.turso.io", ["--ya-ini-produksi"])).toBe(true);
  });
});
