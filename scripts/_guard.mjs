// Pengaman skrip yang MENULIS ke DB: tolak jalan terhadap DB selain file lokal
// kecuali dijalankan dengan --ya-ini-produksi.
export function izinTulis(url, argv) {
  return Boolean(url?.startsWith("file:")) || argv.includes("--ya-ini-produksi");
}

export function wajibIzinProduksi() {
  if (izinTulis(process.env.DATABASE_URL, process.argv)) return;
  console.error(
    "Tolak jalan: skrip ini MENULIS data dan DATABASE_URL bukan file lokal.\n" +
      "Kalau memang sengaja ke produksi, tambahkan argumen --ya-ini-produksi.",
  );
  process.exit(1);
}
