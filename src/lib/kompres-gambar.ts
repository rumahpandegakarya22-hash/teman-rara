type Bitmap = { width: number; height: number; close?: () => void };

export type DepsKompres = {
  decode: (file: File) => Promise<Bitmap>;
  encode: (bmp: Bitmap, lebar: number, tinggi: number, kualitas: number) => Promise<Blob>;
};

const depsBrowser: DepsKompres = {
  decode: (file) => createImageBitmap(file),
  encode: async (bmp, lebar, tinggi, kualitas) => {
    const sumber = bmp as ImageBitmap;
    if (typeof OffscreenCanvas !== "undefined") {
      const c = new OffscreenCanvas(lebar, tinggi);
      c.getContext("2d")!.drawImage(sumber, 0, 0, lebar, tinggi);
      return c.convertToBlob({ type: "image/jpeg", quality: kualitas });
    }
    const c = document.createElement("canvas");
    c.width = lebar;
    c.height = tinggi;
    c.getContext("2d")!.drawImage(sumber, 0, 0, lebar, tinggi);
    return new Promise<Blob>((ok, gagal) =>
      c.toBlob((b) => (b ? ok(b) : gagal(new Error("toBlob kosong"))), "image/jpeg", kualitas),
    );
  },
};

/**
 * Kecilkan foto JPEG/PNG di browser sebelum diunggah. Aman dipanggil untuk
 * berkas apa pun: selain gambar, gagal decode (mis. HEIC), atau hasil yang
 * tidak lebih kecil → berkas asli dikembalikan dan server yang memvalidasi.
 */
export async function kompresGambar(
  file: File,
  opsi: { sisiMaks?: number; kualitas?: number; deps?: DepsKompres } = {},
): Promise<File> {
  const { sisiMaks = 1600, kualitas = 0.8, deps = depsBrowser } = opsi;
  if (file.type !== "image/jpeg" && file.type !== "image/png") return file;

  try {
    const bmp = await deps.decode(file);
    const skala = Math.min(1, sisiMaks / Math.max(bmp.width, bmp.height));
    const blob = await deps.encode(
      bmp,
      Math.round(bmp.width * skala),
      Math.round(bmp.height * skala),
      kualitas,
    );
    bmp.close?.();
    if (blob.size >= file.size) return file;
    const nama = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nama, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
