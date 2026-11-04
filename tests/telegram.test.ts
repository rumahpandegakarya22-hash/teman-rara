import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { kirimTelegram } from "@/lib/telegram";

vi.mock("@/db", () => ({ db: {} }));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  process.env.TELEGRAM_BOT_TOKEN = "123:ABC";
  process.env.TELEGRAM_CHAT_ID = "-1001";
});
afterEach(() => vi.restoreAllMocks());

describe("kirimTelegram", () => {
  it("mengirim ke endpoint bot dengan chat_id dan parse_mode HTML", async () => {
    expect(await kirimTelegram("halo")).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bot123:ABC/sendMessage");
    expect(JSON.parse(init.body)).toEqual({ chat_id: "-1001", text: "halo", parse_mode: "HTML" });
  });

  it("tidak melempar saat Telegram membalas error", async () => {
    fetchMock.mockResolvedValue(new Response("gagal", { status: 500 }));
    expect(await kirimTelegram("x")).toEqual({ ok: false });
  });

  it("tidak melempar saat jaringan putus", async () => {
    fetchMock.mockRejectedValue(new Error("net"));
    expect(await kirimTelegram("x")).toEqual({ ok: false });
  });

  it("env kosong: ok false dan tidak memanggil fetch", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    expect(await kirimTelegram("x")).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("memotong pesan di batas 4096 karakter Telegram", async () => {
    await kirimTelegram("a".repeat(5000));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text.length).toBeLessThanOrEqual(4096);
  });
});

describe("kirimKePengelola", () => {
  it("meng-escape teks pengguna supaya tag HTML tidak lolos, dan mempertahankan judul tebal", async () => {
    const { kirimKePengelola } = await import("@/lib/push");
    await kirimKePengelola({ title: "Pengaduan baru", body: "Budi <b>& Co</b>" });
    const text = JSON.parse(fetchMock.mock.calls[0][1].body).text as string;
    expect(text).toBe("<b>Pengaduan baru</b>\nBudi &lt;b&gt;&amp; Co&lt;/b&gt;");
  });
});
