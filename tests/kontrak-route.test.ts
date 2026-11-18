import { beforeEach, describe, expect, it, vi } from "vitest";

const kontrakAktif = vi.fn();
vi.mock("@/lib/kontrak", () => ({ kontrakAktif, NAMA_KONTRAK: "kontrak-sewa" }));
vi.mock("@/lib/google", () => ({ getAccessToken: async () => "token" }));

describe("GET /api/kontrak", () => {
  beforeEach(() => {
    process.env.DRIVE_FOLDER_DOKUMEN_INTERNAL = "folder1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("alt=media") ? new Response("%PDF-isi") : Response.json({ files: [{ id: "abc" }] }),
      ),
    );
  });

  it("404 saat fitur mati, PDF saat aktif (tanpa login)", async () => {
    const { GET } = await import("@/app/api/kontrak/route");
    kontrakAktif.mockResolvedValue(false);
    expect((await GET()).status).toBe(404);
    kontrakAktif.mockResolvedValue(true);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });
});
