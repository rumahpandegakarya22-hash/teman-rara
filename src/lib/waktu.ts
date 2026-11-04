const MS_PER_HARI = 86_400_000;
const OFFSET_WIB_MS = 7 * 3_600_000;

/** Tanggal hari ini di WIB (UTC+7), format YYYY-MM-DD. */
export function hariIniWIB(sekarang: Date = new Date()): string {
  return new Date(sekarang.getTime() + OFFSET_WIB_MS).toISOString().slice(0, 10);
}

/** Selisih hari kalender dari `dari` ke `ke` (positif jika `ke` lebih akhir). */
export function selisihHari(dari: string, ke: string): number {
  return Math.round((Date.parse(`${ke}T00:00:00Z`) - Date.parse(`${dari}T00:00:00Z`)) / MS_PER_HARI);
}

export function tambahHari(tanggal: string, n: number): string {
  const t = new Date(`${tanggal}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
