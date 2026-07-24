/**
 * Samakan bentuk nomor HP sebelum dibandingkan. Data existing diisi lewat
 * beberapa jalur (trigger check-in, input staf), jadi bentuknya campur:
 * "0812...", "+62812...", "62812...", ada yang pakai spasi atau strip.
 */
export function normalisasiHp(nomor: string) {
  const angka = nomor.replace(/[^0-9+]/g, "");
  if (angka.startsWith("+62")) return "0" + angka.slice(3);
  if (angka.startsWith("62")) return "0" + angka.slice(2);
  return angka;
}

/** Bentuk 62xxxxxxxxxx, dipakai form pendaftaran penghuni baru. */
export function normalisasi62(nomor: string) {
  const lokal = normalisasiHp(nomor); // jadi 08xxxx dulu
  return lokal.startsWith("0") ? `62${lokal.slice(1)}` : lokal;
}

/** Cocokkan dua nomor HP tanpa peduli format penulisannya. */
export function hpSama(a: string | null, b: string | null) {
  if (!a || !b) return false;
  const na = normalisasiHp(a);
  const nb = normalisasiHp(b);
  return na.length >= 9 && na === nb;
}
