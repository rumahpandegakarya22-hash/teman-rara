-- =========================================================================
-- Akses akun Teman Rara mengikuti keberadaan baris active_tenant.
-- Dipasang di active_tenant (bukan booking) supaya semua jalur tertangkap:
--   - checkout lewat trg_booking_checkout_upd (DELETE active_tenant)
--   - hapus manual dari Ops
--   - check-in baru menimpa kamar yang belum di-checkout (UPDATE id_penghuni)
--   - checkout dibatalkan: booking kembali Check-in dengan id_penghuni sama (INSERT)
-- Trigger Ops yang sudah ada TIDAK diubah.
-- Langganan push tidak dipulihkan otomatis; browser penghuni berlangganan ulang
-- lewat /api/push/subscribe.
-- =========================================================================

CREATE TRIGGER IF NOT EXISTS trg_tr_account_cabut_del
AFTER DELETE ON active_tenant
WHEN OLD.id_penghuni IS NOT NULL
BEGIN
  UPDATE tr_account SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
   WHERE id_penghuni = OLD.id_penghuni AND revoked_at IS NULL;
  UPDATE tr_push_subscription SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
   WHERE id_penghuni = OLD.id_penghuni AND deleted_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_tr_account_cabut_upd
AFTER UPDATE OF id_penghuni ON active_tenant
WHEN OLD.id_penghuni IS NOT NULL AND OLD.id_penghuni IS NOT NEW.id_penghuni
BEGIN
  UPDATE tr_account SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
   WHERE id_penghuni = OLD.id_penghuni AND revoked_at IS NULL;
  UPDATE tr_push_subscription SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
   WHERE id_penghuni = OLD.id_penghuni AND deleted_at IS NULL;
  UPDATE tr_account SET revoked_at = NULL, updated_at = CURRENT_TIMESTAMP
   WHERE id_penghuni = NEW.id_penghuni AND revoked_at IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_tr_account_pulih_ins
AFTER INSERT ON active_tenant
WHEN NEW.id_penghuni IS NOT NULL
BEGIN
  UPDATE tr_account SET revoked_at = NULL, updated_at = CURRENT_TIMESTAMP
   WHERE id_penghuni = NEW.id_penghuni AND revoked_at IS NOT NULL;
END;

-- Backfill: tautan milik penghuni yang sudah tidak ada di active_tenant.
UPDATE tr_account SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE revoked_at IS NULL
   AND id_penghuni NOT IN (SELECT id_penghuni FROM active_tenant WHERE id_penghuni IS NOT NULL);
