-- Kolom yang ditambahkan migrasi Ops (kost-tiga-dara/db/schema/004 dan 005) dan
-- dipetakan di src/db/schema.ts. Hanya untuk replika lokal/test; produksi sudah punya.
ALTER TABLE tr_payment_proof ADD COLUMN rejected_at TEXT;
ALTER TABLE tr_payment_proof ADD COLUMN rejected_by TEXT;
ALTER TABLE tr_payment_proof ADD COLUMN rejected_reason TEXT;
ALTER TABLE tenant_complain ADD COLUMN response_note TEXT;
ALTER TABLE tenant_complain ADD COLUMN responded_by TEXT;
ALTER TABLE tenant_complain ADD COLUMN responded_at TEXT;
ALTER TABLE feedback ADD COLUMN reported_at TEXT;
