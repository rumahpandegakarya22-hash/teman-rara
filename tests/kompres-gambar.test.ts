import { describe, expect, it } from "vitest";
import { kompresGambar, type DepsKompres } from "@/lib/kompres-gambar";

const foto = (ukuran: number, tipe = "image/jpeg") =>
  new File([new Uint8Array(ukuran)], "foto.jpeg", { type: tipe });

const depsKecil: DepsKompres = {
  decode: async () => ({ width: 4000, height: 3000 }),
  encode: async () => new Blob([new Uint8Array(100)]),
};

describe("kompresGambar", () => {
  it("mengembalikan berkas yang sama untuk PDF", async () => {
    const pdf = new File(["%PDF"], "a.pdf", { type: "application/pdf" });
    expect(await kompresGambar(pdf, { deps: depsKecil })).toBe(pdf);
  });

  it("mengembalikan berkas asli bila decode gagal (mis. HEIC)", async () => {
    const f = foto(1000);
    const deps: DepsKompres = { ...depsKecil, decode: async () => { throw new Error("tak bisa didecode"); } };
    expect(await kompresGambar(f, { deps })).toBe(f);
  });

  it("mengembalikan berkas asli bila hasil tidak lebih kecil", async () => {
    const f = foto(50);
    expect(await kompresGambar(f, { deps: depsKecil })).toBe(f);
  });

  it("mengembalikan JPEG lebih kecil dan memperkecil sisi terpanjang ke batas", async () => {
    const f = foto(5000, "image/png");
    let dimensi: [number, number] = [0, 0];
    const deps: DepsKompres = {
      ...depsKecil,
      encode: async (_b, w, h) => { dimensi = [w, h]; return new Blob([new Uint8Array(100)]); },
    };
    const hasil = await kompresGambar(f, { deps });
    expect(hasil).not.toBe(f);
    expect(hasil.type).toBe("image/jpeg");
    expect(hasil.name).toBe("foto.jpg");
    expect(dimensi).toEqual([1600, 1200]);
  });
});
