import { describe, expect, it } from "vitest";
import { UKURAN_MAKS, validasiBerkas } from "@/lib/storage";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const pdf = new TextEncoder().encode("%PDF-1.7\n...");

describe("validasiBerkas", () => {
  it("menerima PNG, JPEG, dan PDF yang isinya cocok dengan tipenya", async () => {
    expect((await validasiBerkas(new File([png], "a.png", { type: "image/png" }))).ok).toBe(true);
    expect((await validasiBerkas(new File([jpg], "a.jpg", { type: "image/jpeg" }))).ok).toBe(true);
    expect((await validasiBerkas(new File([pdf], "a.pdf", { type: "application/pdf" }))).ok).toBe(true);
  });

  it("menolak berkas berlabel PNG tapi isinya teks", async () => {
    const r = await validasiBerkas(new File(["bukan gambar"], "a.png", { type: "image/png" }));
    expect(r.ok).toBe(false);
  });

  it("menolak berkas lebih dari batas dengan pesan yang menyebut batasnya", async () => {
    const besar = new Uint8Array(UKURAN_MAKS + 1);
    besar.set(png);
    const r = await validasiBerkas(new File([besar], "a.png", { type: "image/png" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.pesan).toContain("2 MB");
  });

  it("menolak berkas kosong", async () => {
    const r = await validasiBerkas(new File([], "a.png", { type: "image/png" }));
    expect(r.ok).toBe(false);
  });

  it("menolak WebP dan tidak menyebutnya sebagai format yang boleh", async () => {
    const r = await validasiBerkas(new File([png], "a.webp", { type: "image/webp" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.pesan).not.toMatch(/webp/i);
  });
});
