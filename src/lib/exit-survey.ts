/** Kuesioner exit survey (mengikuti Google Form "Exit Survey Kost"). Skala 1-5 untuk semua rating. */
export const SKALA = "1 Sangat Tidak Puas · 2 Tidak Puas · 3 Netral · 4 Puas · 5 Sangat Puas";

export const RATING_FASILITAS = [
  { nama: "rating_kebersihan_umum", label: "Kebersihan fasilitas umum" },
  { nama: "rating_furniture", label: "Kondisi kelayakan furniture kamar" },
  { nama: "rating_air", label: "Ketersediaan air bersih" },
  { nama: "rating_wifi", label: "Akses internet (kecepatan WiFi)" },
  { nama: "rating_keamanan", label: "Keamanan kost" },
  { nama: "rating_bangunan", label: "Kondisi bangunan kost" },
] as const;

export const RATING_PELAYANAN = [
  { nama: "rating_keramahan", label: "Keramahan pengelola" },
  { nama: "rating_respon", label: "Kecepatan respon pengelola jika ada feedback" },
  { nama: "rating_aturan_jelas", label: "Kejelasan aturan kost" },
  { nama: "rating_aturan_relevan", label: "Relevansi aturan kost dengan kehidupan penghuni" },
  { nama: "rating_pembayaran", label: "Kemudahan pembayaran" },
] as const;

export const NAMA_RATING = [...RATING_FASILITAS, ...RATING_PELAYANAN].map((r) => r.nama);
export const NAMA_YA_TIDAK = ["puas", "rekomendasi"] as const;
export const NAMA_TEKS = ["masukan_fasilitas", "masukan_pengelola", "disukai", "tidak_disukai"] as const;
