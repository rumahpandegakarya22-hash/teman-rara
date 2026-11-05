-- =========================================================================
-- Rate limit berbasis DB (fixed window). Pengganti Map di memori yang tidak
-- bekerja di Cloudflare Workers (isolate banyak dan sering di-reset).
-- Satu baris = satu (kunci, jendela); `jendela` = waktu mulai jendela (detik epoch),
-- `jumlah` bertambah tiap percobaan.
-- Baris lama dibersihkan oleh cron (bersihkanRateLimit).
-- =========================================================================

CREATE TABLE IF NOT EXISTS tr_rate_limit (
  kunci   TEXT NOT NULL,
  jendela INTEGER NOT NULL,
  jumlah  INTEGER NOT NULL,
  PRIMARY KEY (kunci, jendela)
);
