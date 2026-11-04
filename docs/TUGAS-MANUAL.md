# Tugas manual sebelum dan sesudah deploy

Semua kode ada di branch `perbaikan-audit` (belum di-push). Urutan di bawah **penting**: ada dua migrasi yang harus jalan sebelum kodenya, dan satu fitur (kode klaim) yang butuh kode dibagikan sebelum penghuni baru bisa klaim akun.

Perintah `turso` dan `npm` dijalankan dari terminal di folder `teman-rara`. Jangan tempel token atau secret ke chat.

---

## Tahap 0. Cek cepat (5 menit, bisa dikerjakan sekarang)

- [ ] **Status OAuth Google Drive.** Buka Google Cloud Console → *APIs & Services* → *OAuth consent screen* (proyek yang dipakai `GOOGLE_CLIENT_ID`).
  - Jika *Publishing status* = **Testing**: klik **Publish app** (ubah ke *In production*). Refresh token berstatus Testing mati tiap 7 hari. Ini kandidat penyebab "token Google Drive kedaluwarsa".
  - Setelah diubah, **buat ulang `GOOGLE_REFRESH_TOKEN`** (token lama yang terbit saat Testing tetap kedaluwarsa) dan perbarui secret di Cloudflare (Tahap 3).
  - Jika sudah *In production*: lanjut.

---

## Tahap 1. Migrasi database (WAJIB sebelum deploy)

Memakai skrip `scripts/migrasi.mjs` (tidak perlu Turso CLI; CLI-nya tidak mendukung Windows secara native). Skrip membaca `DATABASE_URL` dan token dari `.env`, yaitu database produksi.

- [ ] Cek keadaan sekarang (hanya membaca):
  ```bash
  node --env-file=.env scripts/migrasi.mjs --cek
  ```
  Sebelum migrasi harus keluar `BELUM tr_rate_limit` dan `BELUM tr_claim_code`.
- [ ] Jalankan migrasi rate limit:
  ```bash
  node --env-file=.env scripts/migrasi.mjs db/migrations/008_rate_limit.sql --ya-ini-produksi
  ```
- [ ] Jalankan migrasi kode klaim:
  ```bash
  node --env-file=.env scripts/migrasi.mjs db/migrations/009_kode_klaim.sql --ya-ini-produksi
  ```
- [ ] Cek ulang. Harus keluar `ADA tr_rate_limit` dan `ADA tr_claim_code`:
  ```bash
  node --env-file=.env scripts/migrasi.mjs --cek
  ```

(Alternatif tanpa terminal: dashboard Turso → database → *SQL console/Shell*, tempel isi kedua file SQL.)

Kedua migrasi aditif (hanya membuat tabel baru), aman diulang karena memakai `IF NOT EXISTS`.

---

## Tahap 2. Bot Telegram untuk notifikasi pengelola

- [ ] Di Telegram, chat ke **@BotFather** → `/newbot` → beri nama dan username → simpan **token** (bentuk `123456:ABC...`).
- [ ] (Disarankan) Buat grup Telegram untuk pengelola dan staf, tambahkan bot ke grup. Atau pakai chat pribadi dengan bot.
- [ ] Kirim satu pesan apa saja di grup/chat itu, lalu buka di browser (ganti `TOKEN`):
  `https://api.telegram.org/botTOKEN/getUpdates`
  Cari `"chat":{"id": ...}`. Itu **chat id** (grup biasanya negatif, mis. `-1001234567890`). Jangan bagikan URL itu, isinya memuat token.
- [ ] Tes kirim manual (ganti nilai):
  ```bash
  curl -s "https://api.telegram.org/botTOKEN/sendMessage" -d chat_id=CHAT_ID -d text="Tes Teman Rara"
  ```
  Pesan harus muncul di chat.

---

## Tahap 3. Secret dan variabel di Cloudflare dan GitHub

**Aplikasi utama** (jalankan di folder `teman-rara`):

- [ ] ```bash
  npx wrangler secret put TELEGRAM_BOT_TOKEN
  ```
  (tempel token saat diminta)
- [ ] Jika di Tahap 0 kamu membuat ulang refresh token Google: `npx wrangler secret put GOOGLE_REFRESH_TOKEN`.

**Cron worker** (folder `cron-worker`, nama worker `teman-rara-cron`):

- [ ] ```bash
  cd cron-worker
  npx wrangler secret put TELEGRAM_BOT_TOKEN
  npx wrangler secret put TELEGRAM_CHAT_ID
  ```

**GitHub** (repo → *Settings* → *Environments* → environment `CLOUDFLARE_API_TOKEN`):

- [ ] Tambah **Variable** `TELEGRAM_CHAT_ID` = chat id dari Tahap 2.

---

## Tahap 4. Token Turso read-only (untuk cek drift skema mingguan)

- [ ] ```bash
  turso db tokens create kost-tiga-dara --read-only
  ```
- [ ] Simpan sebagai **Secret** `DATABASE_AUTH_TOKEN_READONLY` di GitHub (environment `CLOUDFLARE_API_TOKEN`, sama seperti di atas). Pastikan Variable `DATABASE_URL` di environment itu sudah ada (sudah dipakai deploy).

Tanpa langkah ini workflow `cek-skema.yml` gagal saat dijalankan. Tidak mempengaruhi deploy.

---

## Tahap 5. Buat kode klaim untuk penghuni (sebelum deploy)

Setelah deploy, penghuni yang **belum** menghubungkan akun wajib memakai kode. Yang sudah tertaut tidak terpengaruh.

- [ ] Buat kode untuk semua penghuni aktif yang belum punya akun (memakai `DATABASE_URL` dari `.env`, yaitu produksi):
  ```bash
  npm run klaim:buat -- --ya-ini-produksi
  ```
  Output berupa tabel `KAMAR  NAMA  KODE`. **Kode hanya tampil sekali** (di database hanya tersimpan hash-nya). Salin ke tempat aman, lalu cetak jadi kartu atau kirim lewat WhatsApp pribadi ke tiap penghuni.
- [ ] Bagikan kode ke masing-masing penghuni. Kode berlaku **30 hari** dan sekali pakai.

Rutinitas selanjutnya:

| Situasi | Perintah |
|---|---|
| Penghuni baru check-in | `npm run klaim:buat -- --kamar 12 --ya-ini-produksi` |
| Kode hilang atau kedaluwarsa | perintah yang sama dengan `--kamar N` (membuat kode baru, menimpa yang lama) |
| Akun dibajak atau penghuni ganti akun | `npm run klaim:reset -- --kamar 12 --ya-ini-produksi` (memutus tautan, mematikan push, memberi kode baru) |

---

## Tahap 6. Deploy

- [ ] Push branch dan buka Pull Request ke `master`:
  ```bash
  git push -u origin perbaikan-audit
  ```
  Buka PR di GitHub. Workflow `CI` akan menjalankan `typecheck`, `lint`, dan `test` pada PR (tidak ada deploy; deploy hanya saat push ke `master`).
- [ ] Setelah CI hijau, **merge** PR. Merge ke `master` memicu workflow *Deploy to Cloudflare*.
- [ ] Pantau tab *Actions*: job harus hijau, termasuk 3 langkah baru (typecheck, lint, test) sebelum build.
- [ ] **Deploy ulang cron-worker** (CI hanya men-deploy aplikasi utama, bukan cron-worker):
  ```bash
  cd cron-worker
  npx wrangler deploy
  ```
  Ini memasang perubahan cron: error dilempar saat gagal, peringatan Telegram, dan Workers Logs.

Jika ada masalah serius setelah deploy: `git revert` merge commit-nya lalu push. Tabel baru boleh dibiarkan.

---

## Tahap 7. Verifikasi setelah deploy (15 menit)

Pakai HP, bukan hanya laptop.

- [ ] **Telegram:** kirim satu pengaduan dari akun penghuni uji. Pesan "Pengaduan baru ..." muncul di grup pengelola.
- [ ] **Kompres foto:** unggah bukti bayar dengan foto langsung dari kamera (3 MB atau lebih). Harus berhasil tanpa pesan "terlalu besar".
- [ ] **Kode klaim:** dengan akun Clerk baru (atau akun uji), buka `/onboarding`, coba kode yang salah (harus ditolak dengan pesan seragam), lalu kode yang benar (masuk ke `/kamar`).
- [ ] **Service worker:** buka `/kamar`, matikan internet/mode pesawat, muat ulang. Harus tampil halaman offline, **bukan** data kamar.
- [ ] **Cron:** buka dashboard Cloudflare → *Workers & Pages* → `teman-rara-cron` → *Logs*. Pastikan tiap 15 menit ada invocation tanpa error. Hal yang sama untuk `teman-rara` (log aplikasi).
- [ ] **Cek skema:** GitHub → *Actions* → *Cek drift skema* → *Run workflow*. Harus hijau.
- [ ] **Dokumen internal:** buka FAQ/peraturan dari akun penghuni (harus bisa). Dari akun Clerk yang belum menghubungkan kamar (tidak boleh, 403).

---

## Tahap 8. Opsional / menyusul

- [ ] Hapus skrip rusak (perlu keputusanmu): `scripts/uji-drive.mjs` (mengimpor `googleapis` yang tidak terpasang) dan `scripts/smoke-dasbor.mjs` (memakai tabel `tenant` lama).
- [ ] **E2E Playwright:** butuh unduh Chromium ±170 MB. Beri tahu bila mau dikerjakan.
- [ ] **Retensi KTP calon penghuni:** tentukan berapa lama disimpan di Drive (calon yang batal, mantan penghuni), lalu minta dibuatkan task penghapusannya.
- [ ] **Belum dikerjakan (butuh plan sendiri):** pengingat WhatsApp, pembayaran QRIS/VA otomatis, CSP, laporan bulanan otomatis, pendaftaran → check-in tanpa input ulang.
