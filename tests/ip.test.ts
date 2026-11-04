import { describe, expect, it } from "vitest";
import { ambilIp } from "@/lib/ip";

describe("ambilIp", () => {
  it("memakai cf-connecting-ip", () => {
    expect(ambilIp(new Headers({ "cf-connecting-ip": "1.2.3.4" }))).toBe("1.2.3.4");
  });
  it("mengabaikan x-forwarded-for yang bisa dipalsukan", () => {
    expect(ambilIp(new Headers({ "x-forwarded-for": "9.9.9.9" }))).toBe("tak-dikenal");
  });
  it("jatuh ke 'tak-dikenal' tanpa header", () => {
    expect(ambilIp(new Headers())).toBe("tak-dikenal");
  });
});
