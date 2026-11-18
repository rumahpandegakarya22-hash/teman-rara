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

CREATE TABLE IF NOT EXISTS tr_exit_survey (
  id                  TEXT PRIMARY KEY,
  id_penghuni         TEXT NOT NULL REFERENCES occupancy_history(id_penghuni),
  checkout_request_id TEXT NOT NULL REFERENCES tr_checkout_request(id),
  rating_kebersihan   INTEGER NOT NULL CHECK (rating_kebersihan BETWEEN 1 AND 5),
  rating_fasilitas    INTEGER NOT NULL CHECK (rating_fasilitas BETWEEN 1 AND 5),
  rating_pelayanan    INTEGER NOT NULL CHECK (rating_pelayanan BETWEEN 1 AND 5),
  rating_harga        INTEGER NOT NULL CHECK (rating_harga BETWEEN 1 AND 5),
  rekomendasi         INTEGER NOT NULL CHECK (rekomendasi IN (0, 1)),
  alasan_utama        TEXT,
  saran               TEXT,
  created_at          TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
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
