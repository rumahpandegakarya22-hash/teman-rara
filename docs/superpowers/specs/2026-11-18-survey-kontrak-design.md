# Desain: Exit Survey, Feedback Rutin, Kontrak Sewa (sementara)

Tanggal: 2026-11-18 · Ukuran: sedang (3 bagian terpisah, dikerjakan berurutan)

## Tujuan
- Kumpulkan masukan penghuni secara terstruktur (saat keluar dan tiap bulan).
- Calon penghuni membaca kontrak dan menyetujuinya di formulir pendaftaran; tanda tangan basah menyusul. Fitur sementara, bisa dimatikan pengelola dari Mini App Ops.

## Non-goal
- Tidak ada pembuatan PDF otomatis dari data penyewa.
- Tidak ada tanda tangan digital.
- Tidak ada layar laporan hasil survei di Ops (tindak lanjut terpisah).
- Tidak mengubah tabel milik Ops (`feedback`, `tenant_complain`, dll).

## Pendekatan terpilih
Tabel baru `tr_*` lewat migrasi `012`. Saklar lewat tabel `app_config` yang sudah ada (milik Ops, key/value, dipakai deposit). Teman Rara hanya MEMBACA `app_config`.

Ditolak: env var (butuh redeploy, tidak bisa diubah dari Ops), tabel setting baru (duplikat `app_config`).

## 1. Kontrak sewa
- Key `kontrak_enabled` di `app_config` ('1' aktif, selain itu nonaktif; baris tidak ada = nonaktif).
- File: `kontrak-sewa.pdf` di folder Drive dokumen internal (`DRIVE_FOLDER_DOKUMEN_INTERNAL`), disajikan route publik `/api/kontrak` yang hanya hidup saat saklar aktif. Versi = konstanta `KONTRAK_VERSI` di `src/lib/kontrak.ts`, dinaikkan saat PDF diganti.
- Seksi di langkah terakhir (Dokumen) `form-pendaftaran`: iframe PDF + link "Buka PDF" + checkbox setuju; tombol kirim terkunci sampai dicentang. Nonaktif → langkah ini tidak muncul.
- Server action `kirimPendaftaran` cek ulang saklar dan flag setuju; bila aktif dan tidak setuju → tolak. Simpan ke `tr_kontrak_persetujuan` (no_booking PK-FK, versi, disetujui_at, ip) dalam alur insert yang sama.
- Ops: halaman `/ops/admin/kontrak` + API `/api/ops/admin/kontrak` (pola sama dengan deposit; akses owner & staff_admin) + menu di `module-icons.tsx`. Menulis `kontrak_enabled` via `setConfig`.

## 2. Exit survey
- Bagian opsional di form Pengajuan Checkout: rating 1-5 (kebersihan, fasilitas, pelayanan, harga), mau rekomendasi (ya/tidak), alasan utama pergi, saran bebas.
- Tabel `tr_exit_survey` (id, id_penghuni FK, checkout_request_id FK, rating_*, rekomendasi, alasan_utama, saran, created_at). Satu per pengajuan checkout.
- Diisi sebelum pengajuan dikirim, karena akun dicabut otomatis saat checkout.

## 3. Feedback rutin
- Kartu "Bagaimana bulan ini?" di beranda penghuni aktif: rating 1-5 + komentar singkat. Hilang setelah diisi untuk bulan itu.
- Tabel `tr_feedback_rutin` (id_penghuni, periode 'YYYY-MM', rating, komentar, created_at), PK (id_penghuni, periode) agar idempoten.

## Keamanan
- Semua action lewat `wajibMasuk`/sesi penghuni (kecuali pendaftaran yang publik, sudah ada rate limit). Validasi rentang rating dan panjang teks di server.
- Teman Rara tidak menulis ke `app_config`.

## Diserahkan ke builder
Teks label, tata letak, test (vitest untuk action), update `cek-skema` dan `scripts/setup-replika.mjs` untuk tabel baru.

## Perubahan di luar repo ini
`D:\Web App KTD\kost-tiga-dara`: 1 halaman, 1 route API, 1 baris menu. Tanpa migrasi (`app_config` sudah ada).
