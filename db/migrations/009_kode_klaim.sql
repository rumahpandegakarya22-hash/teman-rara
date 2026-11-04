-- =========================================================================
-- Kode klaim akun. Nomor kamar + nomor HP saja tidak cukup membuktikan
-- seseorang itu penghuninya (nomor HP bukan rahasia), jadi pengelola
-- membagikan kode sekali pakai. Hanya HASH (SHA-256) yang disimpan.
-- =========================================================================

CREATE TABLE IF NOT EXISTS tr_claim_code (
  id_penghuni TEXT PRIMARY KEY REFERENCES occupancy_history(id_penghuni),
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
