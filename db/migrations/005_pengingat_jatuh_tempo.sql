-- =========================================================================
-- Guard idempotensi pengingat jatuh tempo tagihan.
--
-- Cron /api/cron/harian dipercepat dari 1x/hari jadi tiap 15 menit (supaya
-- sinkron status pengaduan lebih responsif). Job pengingat jatuh tempo tidak
-- boleh ikut jalan 96x/hari tanpa guard — bisa spam push ke penghuni. Tabel
-- ini mencatat kombinasi (invoice, offset_hari) yang sudah pernah dikirim;
-- primary key komposit menolak insert kedua untuk pasangan yang sama.
--
-- Dibuat: 2026-07-28
-- =========================================================================

CREATE TABLE IF NOT EXISTS tr_invoice_reminder_sync (
  invoice_sewa_id  INTEGER NOT NULL REFERENCES invoice_sewa(id),
  offset_hari      INTEGER NOT NULL,
  sent_at          TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (invoice_sewa_id, offset_hari)
);
