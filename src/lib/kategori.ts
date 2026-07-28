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

/**
 * Jenis masukan. Nilainya harus sama persis dengan setting
 * `LOGBOOK_FEEDBACK:Kategori` di Mini Apps Ops, karena keduanya menulis ke
 * tabel yang sama dan handler Ops membedakan tujuan tabel dari string ini.
 *
 * Komplain  → tabel `tenant_complain` (tiket, ada status & foto bukti)
 * Saran     → tabel `feedback`
 * Kritik    → tabel `feedback`
 *
 * Sebelum ini semua yang dikirim penghuni dipaksa jadi Komplain, sehingga
 * saran dan kritik tidak pernah tercatat sebagai apa pun.
 */
export const JENIS_MASUKAN = ["Komplain", "Saran", "Kritik"] as const;
export type JenisMasukan = (typeof JENIS_MASUKAN)[number];

export const DESKRIPSI_JENIS: Record<JenisMasukan, string> = {
  Komplain: "Ada yang rusak atau mengganggu dan perlu ditangani",
  Saran: "Usulan perbaikan atau fasilitas baru",
  Kritik: "Masukan atas pelayanan atau pengelolaan",
};

/** Hanya Komplain yang jadi tiket dengan status & foto yang bisa dipantau. */
export const jadiTiket = (jenis: JenisMasukan) => jenis === "Komplain";

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
 * Menunggu, Diproses, Selesai, dan Dibatalkan. "Review" adalah nilai lama yang
 * masih dipakai baris-baris sebelum migrasi, dipetakan ke Menunggu.
 *
 * Daftar ini WAJIB sama dengan kost-tiga-dara/src/lib/core/complain.ts —
 * kedua aplikasi menulis ke kolom yang sama, dan kosakata yang berbeda pernah
 * membuat progres kerja pengelola tidak pernah terlihat oleh penghuni.
 */
export const STATUS_BAKU = ["Menunggu", "Diproses", "Selesai", "Dibatalkan"] as const;
export type StatusBaku = (typeof STATUS_BAKU)[number];

/** Pengaduan yang masih boleh dibatalkan pelapornya sendiri. */
export const STATUS_BISA_BATAL: StatusBaku[] = ["Menunggu"];

export function normalisasiStatus(status: string | null | undefined): StatusBaku {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "selesai") return "Selesai";
  if (s === "diproses") return "Diproses";
  if (s === "dibatalkan") return "Dibatalkan";
  return "Menunggu";
}
