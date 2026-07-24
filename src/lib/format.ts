const NEW_WINDOW_DAYS = 7;

export function formatTanggal(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

export function isBaru(iso: string) {
  return Date.now() - new Date(iso).getTime() < NEW_WINDOW_DAYS * 86_400_000;
}

export function formatRupiah(nominal: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nominal);
}

export function cuplikan(text: string, max = 120) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}
