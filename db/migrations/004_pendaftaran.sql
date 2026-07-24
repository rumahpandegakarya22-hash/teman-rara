-- =========================================================================
-- Pendaftaran penghuni baru (Skema A).
--
-- Data inti masuk ke tabel `booking` existing dengan status 'Pending' — nilai
-- ini sengaja BUKAN 'Check-in', supaya trigger trg_booking_checkin_ins tidak
-- ikut membuat occupancy_history/active_tenant sebelum staf memverifikasi.
--
-- Data diri lengkap + tautan dokumen Drive disimpan di tabel baru di bawah,
-- karena `booking` tidak punya kolomnya. Struktur tabel existing tidak diubah.
--
-- Dibuat: 2026-07-24
-- =========================================================================

CREATE TABLE IF NOT EXISTS tr_pendaftaran (
  no_booking        TEXT PRIMARY KEY REFERENCES booking(no_booking),

  -- Data diri
  email             TEXT NOT NULL,
  nama_lengkap      TEXT NOT NULL,
  nama_panggilan    TEXT,
  asal_daerah       TEXT,
  no_hp             TEXT NOT NULL,          -- disimpan format 62xxxxxxxxxx
  no_kamar          TEXT NOT NULL,
  rencana_masuk     TEXT NOT NULL,          -- 'YYYY-MM-DD'
  pekerjaan         TEXT NOT NULL CHECK (pekerjaan IN ('Karyawati', 'Mahasiswi')),
  program_studi     TEXT,                   -- '-' bila bukan mahasiswi
  institusi         TEXT NOT NULL,

  -- Kontak darurat 1 wajib, 2 opsional
  darurat1_nama     TEXT NOT NULL,
  darurat1_nomor    TEXT NOT NULL,
  darurat1_relasi   TEXT NOT NULL,
  darurat2_nama     TEXT,
  darurat2_nomor    TEXT,
  darurat2_relasi   TEXT,

  -- Barang bawaan
  jumlah_gadget     INTEGER NOT NULL CHECK (jumlah_gadget BETWEEN 1 AND 5),
  barang_elektronik TEXT,                   -- selain kipas, HP, laptop, tablet, rice cooker

  -- Dokumen di Google Drive (disajikan lewat route terproteksi)
  url_identitas     TEXT NOT NULL,
  url_bukti_dp      TEXT NOT NULL,

  created_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_tr_pendaftaran_kamar ON tr_pendaftaran (no_kamar, created_at);

-- Sumber leads baru supaya staf tahu pendaftaran datang dari aplikasi penghuni.
-- Menambah DATA, bukan mengubah struktur tabel settings.
INSERT INTO settings (grup, kolom, nilai, urutan, aktif)
VALUES ('LOG_SALES', 'Sumber Leads', 'Teman Rara', 6, 1)
ON CONFLICT (grup, kolom, nilai) DO NOTHING;
