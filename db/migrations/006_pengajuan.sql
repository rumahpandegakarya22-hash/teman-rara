-- =========================================================================
-- Pengajuan mandiri penghuni: Checkout & Pindah Kamar.
--
-- Pola mengikuti tr_pendaftaran: penghuni MENGAJUKAN, pengelola yang
-- MENGEKSEKUSI. Baris di sini adalah PERMINTAAN berstatus 'Menunggu' — TIDAK
-- langsung mengubah active_tenant/occupancy_history/booking. Efek nyata
-- (checkout_log / rooms_transfer + mutasi hunian) tetap lewat modul
-- Checkout / Pindah Kamar di Mini App Ops saat pengelola menyetujui ("acc").
--
-- FK ke occupancy_history(id_penghuni): identitas permanen yang dipakai tabel
-- tr_* lain, tidak ikut terhapus saat checkout (beda dari active_tenant).
--
-- Dibuat: 2026-08-06
-- =========================================================================

CREATE TABLE IF NOT EXISTS tr_checkout_request (
  id                TEXT PRIMARY KEY,
  id_penghuni       TEXT NOT NULL REFERENCES occupancy_history(id_penghuni),
  no_kamar          TEXT NOT NULL,                 -- snapshot kamar saat mengajukan
  tanggal_checkout  TEXT NOT NULL,                 -- rencana keluar 'YYYY-MM-DD'
  alasan            TEXT NOT NULL,
  catatan           TEXT,

  status            TEXT NOT NULL DEFAULT 'Menunggu'
                      CHECK (status IN ('Menunggu','Disetujui','Ditolak','Dibatalkan','Selesai')),
  response_note     TEXT,                          -- catatan pengelola saat memproses
  processed_by      TEXT,
  processed_at      TEXT,

  created_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_tr_checkout_req_penghuni ON tr_checkout_request (id_penghuni, created_at);
CREATE INDEX IF NOT EXISTS idx_tr_checkout_req_status ON tr_checkout_request (status, created_at);

CREATE TABLE IF NOT EXISTS tr_pindah_request (
  id                TEXT PRIMARY KEY,
  id_penghuni       TEXT NOT NULL REFERENCES occupancy_history(id_penghuni),
  no_kamar_lama     TEXT NOT NULL,                 -- snapshot kamar saat mengajukan
  no_kamar_baru     TEXT NOT NULL,                 -- kamar tujuan yang diminta
  tanggal           TEXT NOT NULL,                 -- rencana pindah 'YYYY-MM-DD'
  alasan            TEXT NOT NULL,
  catatan           TEXT,

  status            TEXT NOT NULL DEFAULT 'Menunggu'
                      CHECK (status IN ('Menunggu','Disetujui','Ditolak','Dibatalkan','Selesai')),
  response_note     TEXT,
  processed_by      TEXT,
  processed_at      TEXT,

  created_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_tr_pindah_req_penghuni ON tr_pindah_request (id_penghuni, created_at);
CREATE INDEX IF NOT EXISTS idx_tr_pindah_req_status ON tr_pindah_request (status, created_at);
