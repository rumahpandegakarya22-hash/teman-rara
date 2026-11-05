/**
 * Samakan bentuk email sebelum dibandingkan. Gmail mengabaikan titik dan bagian
 * setelah "+" di nama pengguna, jadi "Nama.X+kost@gmail.com" dan "namax@gmail.com"
 * adalah kotak masuk yang sama. Domain lain hanya diseragamkan huruf kecilnya.
 */
export function normalisasiEmail(email: string) {
  const [nama = "", domain = ""] = email.trim().toLowerCase().split("@");
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${nama.split("+")[0].replaceAll(".", "")}@gmail.com`;
  }
  return `${nama}@${domain}`;
}

export function emailSama(a: string | null, b: string | null) {
  if (!a || !b) return false;
  const na = normalisasiEmail(a);
  return na.length > 3 && na === normalisasiEmail(b);
}

/** Samakan huruf besar/kecil dan spasi berlebih sebelum membandingkan nama. */
export function namaSama(masukan: string, ...kandidat: (string | null)[]) {
  const rapi = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const m = rapi(masukan);
  return m.length > 0 && kandidat.some((k) => k && rapi(k) === m);
}
