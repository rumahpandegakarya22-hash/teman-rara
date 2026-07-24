// Dipakai server maupun klien. Jangan tambahkan impor server-only di sini.

// Persis sama dengan CHECK(category) di tabel tenant_complain existing.
// Menyimpang sedikit pun akan ditolak database.
export const KATEGORI = [
  "Internet",
  "Listrik",
  "Air",
  "AC",
  "kebersihan",
  "Keamanan",
  "Fasilitas",
  "Pelayanan",
  "Lainnya",
] as const;

export type Kategori = (typeof KATEGORI)[number];

export const LABEL_KATEGORI: Record<Kategori, string> = {
  Internet: "Internet",
  Listrik: "Listrik",
  Air: "Air",
  AC: "AC",
  kebersihan: "Kebersihan",
  Keamanan: "Keamanan",
  Fasilitas: "Fasilitas",
  Pelayanan: "Pelayanan",
  Lainnya: "Lainnya",
};

/**
 * Status pengaduan di tabel existing bertipe TEXT bebas. Nilai bakunya kini
 * Menunggu, Diproses, dan Selesai. "Review" adalah nilai lama yang masih
 * dipakai baris-baris sebelum migrasi, dipetakan ke Menunggu.
 */
export const STATUS_BAKU = ["Menunggu", "Diproses", "Selesai"] as const;
export type StatusBaku = (typeof STATUS_BAKU)[number];

export function normalisasiStatus(status: string | null | undefined): StatusBaku {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "selesai") return "Selesai";
  if (s === "diproses") return "Diproses";
  return "Menunggu";
}
