import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: () => {
      throw new Error("no such table: tr_rate_limit");
    },
  },
}));

describe("cobaPakai saat DB bermasalah", () => {
  it("fail-open: tidak melempar dan tetap mengizinkan", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { cobaPakai } = await import("@/lib/rate-limit");
    await expect(cobaPakai("k", 3, 60)).resolves.toEqual({ ok: true, sisa: 3 });
    expect(err).toHaveBeenCalled();
  });
});
