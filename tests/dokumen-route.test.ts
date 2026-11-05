import { beforeEach, describe, expect, it, vi } from "vitest";

const getSesiPenghuni = vi.fn();
vi.mock("@/lib/tenant", () => ({ getSesiPenghuni }));
vi.mock("@/lib/google", () => ({ getAccessToken: async () => "token" }));

const panggil = async (nama: string) => {
  const { GET } = await import("@/app/api/dokumen/[nama]/route");
  return GET(new Request("http://x") as never, { params: Promise.resolve({ nama }) });
};

describe("GET /api/dokumen/[nama]", () => {
  beforeEach(() => {
    getSesiPenghuni.mockReset();
    process.env.DRIVE_FOLDER_DOKUMEN_INTERNAL = "folder1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("alt=media")
          ? new Response("%PDF-isi", { status: 200 })
          : Response.json({ files: [{ id: "abc" }] }),
      ),
    );
  });

  it("404 untuk nama tak dikenal tanpa memeriksa sesi", async () => {
    expect((await panggil("rahasia")).status).toBe(404);
    expect(getSesiPenghuni).not.toHaveBeenCalled();
  });

  it("401 untuk tamu", async () => {
    getSesiPenghuni.mockResolvedValue({ status: "tamu", penghuni: null });
    expect((await panggil("faq-penghuni")).status).toBe(401);
  });

  it("403 untuk akun yang login tapi belum jadi penghuni aktif", async () => {
    getSesiPenghuni.mockResolvedValue({ status: "belum_klaim", penghuni: null });
    expect((await panggil("faq-penghuni")).status).toBe(403);
    getSesiPenghuni.mockResolvedValue({ status: "berakhir", penghuni: null });
    expect((await panggil("faq-penghuni")).status).toBe(403);
  });

  it("200 untuk penghuni aktif", async () => {
    getSesiPenghuni.mockResolvedValue({ status: "aktif", penghuni: { id_penghuni: "P1" } });
    const res = await panggil("faq-penghuni");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });
});
