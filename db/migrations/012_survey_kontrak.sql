-- Exit survey, feedback rutin, persetujuan kontrak sewa.
-- app_config milik Mini App Ops (sudah ada di produksi); IF NOT EXISTS hanya
-- untuk replika lokal/test. Teman Rara cuma MEMBACA tabel ini.
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_by TEXT,
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS tr_kontrak_persetujuan (
  no_booking   TEXT PRIMARY KEY REFERENCES booking(no_booking),
  versi        TEXT NOT NULL,
  disetujui_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  ip           TEXT
);

-- Mengikuti kuesioner Google Form "Exit Survey Kost" (rating 1-5, teks wajib, "-" bila kosong).
CREATE TABLE IF NOT EXISTS tr_exit_survey (
  id                    TEXT PRIMARY KEY,
  id_penghuni           TEXT NOT NULL REFERENCES occupancy_history(id_penghuni),
  checkout_request_id   TEXT NOT NULL REFERENCES tr_checkout_request(id),

  rating_kebersihan_umum INTEGER NOT NULL CHECK (rating_kebersihan_umum BETWEEN 1 AND 5),
  rating_furniture       INTEGER NOT NULL CHECK (rating_furniture BETWEEN 1 AND 5),
  rating_air             INTEGER NOT NULL CHECK (rating_air BETWEEN 1 AND 5),
  rating_wifi            INTEGER NOT NULL CHECK (rating_wifi BETWEEN 1 AND 5),
  rating_keamanan        INTEGER NOT NULL CHECK (rating_keamanan BETWEEN 1 AND 5),
  rating_bangunan        INTEGER NOT NULL CHECK (rating_bangunan BETWEEN 1 AND 5),
  masukan_fasilitas      TEXT NOT NULL,

  rating_keramahan       INTEGER NOT NULL CHECK (rating_keramahan BETWEEN 1 AND 5),
  rating_respon          INTEGER NOT NULL CHECK (rating_respon BETWEEN 1 AND 5),
  rating_aturan_jelas    INTEGER NOT NULL CHECK (rating_aturan_jelas BETWEEN 1 AND 5),
  rating_aturan_relevan  INTEGER NOT NULL CHECK (rating_aturan_relevan BETWEEN 1 AND 5),
  rating_pembayaran      INTEGER NOT NULL CHECK (rating_pembayaran BETWEEN 1 AND 5),
  masukan_pengelola      TEXT NOT NULL,

  puas                   INTEGER NOT NULL CHECK (puas IN (0, 1)),
  rekomendasi            INTEGER NOT NULL CHECK (rekomendasi IN (0, 1)),
  disukai                TEXT NOT NULL,
  tidak_disukai          TEXT NOT NULL,

  created_at             TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tr_exit_survey_req ON tr_exit_survey (checkout_request_id);

CREATE TABLE IF NOT EXISTS tr_feedback_rutin (
  id_penghuni TEXT NOT NULL REFERENCES occupancy_history(id_penghuni),
  periode     TEXT NOT NULL,            -- 'YYYY-MM'
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  komentar    TEXT,
  created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (id_penghuni, periode)
);
