import { beforeEach, describe, expect, it, vi } from "vitest";
import { cocokSecret } from "@/lib/cron-auth";

describe("cocokSecret", () => {
  it("true hanya bila persis sama", () => {
    expect(cocokSecret("rahasia", "rahasia")).toBe(true);
    expect(cocokSecret("rahasiA", "rahasia")).toBe(false);
    expect(cocokSecret("rahasia!", "rahasia")).toBe(false);
    expect(cocokSecret("rah", "rahasia")).toBe(false);
  });
  it("false bila salah satu kosong", () => {
    expect(cocokSecret(null, "rahasia")).toBe(false);
    expect(cocokSecret("rahasia", undefined)).toBe(false);
    expect(cocokSecret("", "")).toBe(false);
  });
});

const telegram = vi.fn<(teks: string) => Promise<{ ok: boolean }>>(async () => ({ ok: true }));
const kuota = vi.fn(async () => ({ ok: true, sisa: 0 }));
vi.mock("@/lib/telegram", () => ({ kirimTelegram: telegram }));
vi.mock("@/lib/rate-limit", () => ({ cobaPakai: kuota }));

const pengingat = vi.fn();
const sinkron = vi.fn();
vi.mock("@/lib/jobs", () => ({
  jalankanPengingatJatuhTempo: pengingat,
  sinkronStatusPengaduan: sinkron,
}));

const panggil = async (auth?: string) => {
  const { GET } = await import("@/app/api/cron/harian/route");
  return GET(new Request("http://x", { headers: auth ? { authorization: auth } : {} }));
};

describe("GET /api/cron/harian", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "s3cret";
    pengingat.mockReset().mockResolvedValue({ ok: 1 });
    sinkron.mockReset().mockResolvedValue({ ok: 1 });
    telegram.mockClear();
    kuota.mockReset().mockResolvedValue({ ok: true, sisa: 0 });
  });

  it("401 tanpa header, atau secret salah", async () => {
    expect((await panggil()).status).toBe(401);
    expect((await panggil("Bearer salah!")).status).toBe(401);
    expect(pengingat).not.toHaveBeenCalled();
  });

  it("200 dan menjalankan kedua job dengan secret benar", async () => {
    expect((await panggil("Bearer s3cret")).status).toBe(200);
    expect(pengingat).toHaveBeenCalledTimes(1);
    expect(sinkron).toHaveBeenCalledTimes(1);
  });

  it("satu job gagal: 500, job lain tetap jalan", async () => {
    pengingat.mockRejectedValue(new Error("boom"));
    const res = await panggil("Bearer s3cret");
    expect(res.status).toBe(500);
    expect(sinkron).toHaveBeenCalledTimes(1);
  });

  it("kegagalan job memicu peringatan Telegram, tapi hanya bila kuota per jam masih ada", async () => {
    pengingat.mockRejectedValue(new Error("boom"));
    await panggil("Bearer s3cret");
    expect(telegram).toHaveBeenCalledTimes(1);
    expect(telegram.mock.calls[0][0]).toContain("pengingat jatuh tempo");

    kuota.mockResolvedValue({ ok: false, sisa: 0 });
    await panggil("Bearer s3cret");
    expect(telegram).toHaveBeenCalledTimes(1);
  });

  it("sukses tidak mengirim peringatan", async () => {
    await panggil("Bearer s3cret");
    expect(telegram).not.toHaveBeenCalled();
  });
});
