-- Nama kendaraan pendaftar (opsional). Kolom sudah diterapkan ke produksi lewat repo Ops (db/schema/023).
ALTER TABLE tr_pendaftaran ADD COLUMN nama_kendaraan TEXT;
