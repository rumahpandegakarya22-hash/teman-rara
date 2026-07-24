/**
 * Daftar dokumen PDF yang tampil di beranda.
 *
 * Versi internal disimpan di `private/peraturan/` (di luar public/) supaya tidak
 * bisa diambil lewat URL langsung; disajikan route /api/dokumen/<nama> yang
 * mengecek sesi. Versi umum boleh statis di `public/peraturan/`.
 */
export const DOKUMEN_INTERNAL = [
  { nama: "peraturan-penghuni", judul: "Peraturan Penghuni" },
  { nama: "panduan-pintu-penghuni", judul: "Panduan Akses Pintu Penghuni" },
  { nama: "faq-penghuni", judul: "FAQ Khusus Penghuni" },
  { nama: "panduan-wifi-penghuni", judul: "Panduan Login Wifi" },
] as const;

export const DOKUMEN_UMUM = [
  { nama: "peraturan-umum", judul: "Peraturan Umum" },
  { nama: "faq-umum", judul: "FAQ Umum" },
] as const;

export type NamaDokumenInternal = (typeof DOKUMEN_INTERNAL)[number]["nama"];

/** Whitelist nama berkas internal. Cegah path traversal lewat parameter URL. */
export function dokumenInternalValid(nama: string): nama is NamaDokumenInternal {
  return DOKUMEN_INTERNAL.some((d) => d.nama === nama);
}
