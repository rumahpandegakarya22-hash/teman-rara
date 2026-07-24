-- =========================================================================
-- Teman Rara — aplikasi penghuni. Objek BARU saja.
--
-- Tidak ada satu pun tabel existing yang diubah strukturnya. Semua tabel di
-- sini berawalan `tr_` dan menempel ke tabel existing lewat foreign key.
--
-- Konvensi mengikuti tabel existing: tanggal TEXT 'YYYY-MM-DD', timestamp TEXT
-- via CURRENT_TIMESTAMP, uang INTEGER rupiah penuh.
-- Aman dijalankan ulang (IF NOT EXISTS).
--
-- Dibuat: 2026-07-23
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. tr_kamar_wifi — kredensial WiFi per kamar.
--    Dipisah dari tabel `kamar` karena beda tanggung jawab: `kamar` menyimpan
--    data properti dan matriks tarif yang diedit lewat /ops/admin/kamar,
--    sedangkan kredensial dirotasi terpisah dan hanya boleh dibaca penghuni
--    kamar bersangkutan. Relasi 1:1, jadi id_kamar langsung jadi primary key.
-- -------------------------------------------------------------------------
-- Catatan: kolom `username` menyimpan nama jaringan (SSID). Nama kolom ini
-- mengikuti tabel yang sudah ter-deploy di Turso dan tidak diubah.
CREATE TABLE IF NOT EXISTS tr_kamar_wifi (
  id_kamar    TEXT PRIMARY KEY REFERENCES kamar(id_kamar),
  username    TEXT NOT NULL,
  password    TEXT NOT NULL,
  catatan     TEXT,
  created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_by  TEXT
);

-- -------------------------------------------------------------------------
-- 2. tr_account — tautan akun Clerk ke penghuni.
--    Menempel ke occupancy_history, BUKAN active_tenant: trigger
--    trg_booking_checkout_upd menghapus baris active_tenant saat check-out,
--    sehingga tautan akun dan riwayat pengaduan akan ikut yatim.
--    revoked_at diisi saat penghuni sudah tidak aktif.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tr_account (
  id_penghuni    TEXT PRIMARY KEY REFERENCES occupancy_history(id_penghuni),
  clerk_user_id  TEXT NOT NULL UNIQUE,
  claimed_at     TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  revoked_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at     TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_tr_account_clerk ON tr_account (clerk_user_id);

-- -------------------------------------------------------------------------
-- 3. tr_payment_proof — bukti transfer yang diunggah penghuni.
--    Append-only: koreksi berarti unggah baru, baris lama tetap tersimpan.
--    CHECK meniru pola tabel `payment` existing: tepat satu invoice dirujuk.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tr_payment_proof (
  id               TEXT PRIMARY KEY,
  id_penghuni      TEXT NOT NULL REFERENCES occupancy_history(id_penghuni),
  invoice_sewa_id  INTEGER REFERENCES invoice_sewa(id),
  invoice_dp_id    INTEGER REFERENCES invoice_dp(id),
  file_url         TEXT NOT NULL,
  file_type        TEXT NOT NULL,
  file_size        INTEGER NOT NULL,
  catatan          TEXT,
  verified_at      TEXT,
  verified_by      TEXT,
  created_at       TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ((invoice_sewa_id IS NOT NULL) + (invoice_dp_id IS NOT NULL) = 1)
);

CREATE INDEX IF NOT EXISTS idx_tr_proof_penghuni ON tr_payment_proof (id_penghuni, created_at);
CREATE INDEX IF NOT EXISTS idx_tr_proof_sewa ON tr_payment_proof (invoice_sewa_id);

-- -------------------------------------------------------------------------
-- 4. tr_complain_photo — foto lampiran pengaduan.
--    Pengaduannya sendiri tetap masuk tabel tenant_complain existing, supaya
--    pengelola cukup memakai satu dashboard.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tr_complain_photo (
  id           TEXT PRIMARY KEY,
  id_complain  TEXT NOT NULL REFERENCES tenant_complain(id_complain),
  id_penghuni  TEXT NOT NULL REFERENCES occupancy_history(id_penghuni),
  file_url     TEXT NOT NULL,
  file_type    TEXT NOT NULL,
  file_size    INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_tr_photo_complain ON tr_complain_photo (id_complain);

-- -------------------------------------------------------------------------
-- 5. tr_complain_sync — jejak status pengaduan yang sudah dinotifikasikan.
--    tenant_complain tidak punya kolom updated_at dan strukturnya tidak boleh
--    diubah, jadi perubahan status dideteksi dengan membandingkan status
--    sekarang terhadap last_status di sini. Pengelola tetap bekerja seperti
--    biasa di dashboard existing.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tr_complain_sync (
  id_complain       TEXT PRIMARY KEY REFERENCES tenant_complain(id_complain),
  last_status       TEXT NOT NULL,
  last_notified_at  TEXT,
  updated_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -------------------------------------------------------------------------
-- 6. tr_information_board — peraturan kost dan pengumuman.
--    Berdiri sendiri, tidak ada padanannya di sistem existing.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tr_information_board (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('rule', 'announcement')),
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  published_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_by    TEXT,
  updated_by    TEXT,
  deleted_at    TEXT,
  deleted_by    TEXT
);

CREATE INDEX IF NOT EXISTS idx_tr_board_type ON tr_information_board (type, published_at);

-- -------------------------------------------------------------------------
-- 7. tr_push_subscription — langganan Web Push per perangkat.
--    id_penghuni NULL berarti pengunjung anonim di papan informasi publik.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tr_push_subscription (
  id           TEXT PRIMARY KEY,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  id_penghuni  TEXT REFERENCES occupancy_history(id_penghuni),
  created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  deleted_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_tr_push_penghuni ON tr_push_subscription (id_penghuni);

-- -------------------------------------------------------------------------
-- 8. tr_notification_preference — preferensi notifikasi per penghuni.
--    Baris dibuat saat penghuni pertama kali mengubah pengaturan; tidak ada
--    baris berarti semua jenis notifikasi aktif.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tr_notification_preference (
  id_penghuni     TEXT PRIMARY KEY REFERENCES occupancy_history(id_penghuni),
  push_enabled    INTEGER NOT NULL DEFAULT 1 CHECK (push_enabled IN (0, 1)),
  email_enabled   INTEGER NOT NULL DEFAULT 1 CHECK (email_enabled IN (0, 1)),
  in_app_enabled  INTEGER NOT NULL DEFAULT 1 CHECK (in_app_enabled IN (0, 1)),
  created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- -------------------------------------------------------------------------
-- 9. Status pengaduan: tambah 'Menunggu' dan 'Diproses'.
--
--    Ini menambah DATA di tabel settings, bukan mengubah strukturnya. Dropdown
--    Status pada modul Feedback di dashboard existing ikut menampilkan ketiga
--    nilai. Kolom tenant_complain.status bertipe TEXT tanpa CHECK, jadi tidak
--    ada constraint yang perlu disesuaikan.
--
--    Urutan dibuat 1/2/3 supaya tampil sesuai alur penanganan.
-- -------------------------------------------------------------------------
INSERT INTO settings (grup, kolom, nilai, urutan, aktif) VALUES
  ('LOGBOOK_FEEDBACK', 'Status', 'Menunggu', 1, 1),
  ('LOGBOOK_FEEDBACK', 'Status', 'Diproses', 2, 1),
  ('LOGBOOK_FEEDBACK', 'Status', 'Selesai',  3, 1)
ON CONFLICT (grup, kolom, nilai) DO NOTHING;

-- 'Selesai' sudah ada di produksi; baris di atas hanya untuk lingkungan yang
-- belum punya. Urutannya tetap disamakan supaya dropdown mengikuti alur.
UPDATE settings SET urutan = 3, aktif = 1
 WHERE grup = 'LOGBOOK_FEEDBACK' AND kolom = 'Status' AND nilai = 'Selesai';

-- 'Review' adalah nilai lama yang searti dengan 'Menunggu'. Dinonaktifkan agar
-- tidak muncul lagi di dropdown, TANPA menghapus barisnya: pengaduan lama yang
-- berstatus 'Review' tetap valid dan ditampilkan sebagai 'Menunggu' di aplikasi
-- penghuni (lihat normalisasiStatus di src/lib/kategori.ts).
UPDATE settings SET aktif = 0
 WHERE grup = 'LOGBOOK_FEEDBACK' AND kolom = 'Status' AND nilai = 'Review';
