# Tugas manual sebelum dan sesudah deploy

Semua kode ada di branch `perbaikan-audit` (belum di-push). Urutan di bawah **penting**: migrasi rate limit harus jalan sebelum kodenya (kalau terlambat, rate limit hanya nonaktif sementara).

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
  Sebelum migrasi harus keluar `BELUM tr_rate_limit`.
- [ ] Jalankan migrasi rate limit:
  ```bash
  node --env-file=.env scripts/migrasi.mjs db/migrations/008_rate_limit.sql --ya-ini-produksi
  ```
- [ ] Cek ulang. Harus keluar `ADA tr_rate_limit`:
  ```bash
  node --env-file=.env scripts/migrasi.mjs --cek
  ```

(Alternatif tanpa terminal: dashboard Turso → database → *SQL console/Shell*, tempel isi file SQL.)

Migrasi ini aditif (hanya membuat tabel baru), aman diulang karena memakai `IF NOT EXISTS`.

> `009_kode_klaim.sql` **tidak perlu dijalankan lagi**: klaim akun memakai email terverifikasi, bukan kode. Di produksi tabel `tr_claim_code` sudah terlanjur dibuat (kosong, tidak berbahaya); boleh di-DROP kapan saja.

---

## Tahap 2. Bot Telegram untuk notifikasi pengelola

- [ ] Di Telegram, chat ke **@BotFather** → `/newbot` → beri nama dan username → simpan **token** (bentuk `123456:ABC...`).
- [ ] (Disarankan) Buat grup Telegram untuk pengelola dan staf, tambahkan bot ke grup. Atau pakai chat pribadi dengan bot.
- [ ] Kirim satu pesan apa saja di grup/chat itu, lalu buka di browser (ganti `TOKEN`):
  `https://api.telegram.org/botTOKEN/getUpdates`
  Cari `"chat":{"id": ...}`. Itu **chat id** (grup biasanya negatif, mis. `-1001234567890`). Jangan bagikan URL itu, isinya memuat token.
- [ ] Tes kirim manual (ganti nilai):
  ```bash
  curl.exe -s "https://api.telegram.org/botTOKEN/sendMessage" -d chat_id=CHAT_ID -d text="Tes Teman Rara"
  ```
  Pesan harus muncul di chat.

---

## Tahap 3. Secret di Cloudflare

**Peringatan:** perintah `wrangler` yang dijalankan dari dalam folder `cron-worker` tanpa `--name` ternyata tetap mengenai worker utama `teman-rara`. Selalu jalankan dari folder `teman-rara` (root) dan sebut worker-nya dengan `--name`.

Chat id disimpan sebagai **secret** (bukan variabel), di kedua worker. Tidak ada variabel GitHub yang perlu ditambah.

Cek dulu apa yang sudah terpasang (hanya menampilkan nama, bukan nilai):

```bash
npx wrangler secret list --name teman-rara
npx wrangler secret list --name teman-rara-cron
```

**Worker utama `teman-rara`:** harus memuat `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID`.

- [ ] ```bash
  npx wrangler secret put TELEGRAM_BOT_TOKEN --name teman-rara
  npx wrangler secret put TELEGRAM_CHAT_ID --name teman-rara
  ```
  (nilai ditempel saat diminta; lewati yang sudah terdaftar dan nilainya benar)
- [ ] Hanya jika di Tahap 0 kamu membuat ulang refresh token Google:
  ```bash
  npx wrangler secret put GOOGLE_REFRESH_TOKEN --name teman-rara
  ```

**Cron worker `teman-rara-cron`:** harus memuat `CRON_SECRET` (sudah ada), `TELEGRAM_BOT_TOKEN`, dan `TELEGRAM_CHAT_ID`.

- [ ] ```bash
  npx wrangler secret put TELEGRAM_BOT_TOKEN --name teman-rara-cron
  npx wrangler secret put TELEGRAM_CHAT_ID --name teman-rara-cron
  ```
- [ ] Cek ulang dengan `secret list --name teman-rara-cron`; harus ada 3 nama di atas.

---

## Tahap 4. Token Turso read-only (untuk cek drift skema mingguan)

- [ ] ```bash
  turso db tokens create kost-tiga-dara --read-only
  ```
- [ ] Simpan sebagai **Secret** `DATABASE_AUTH_TOKEN_READONLY` di GitHub (environment `CLOUDFLARE_API_TOKEN`, sama seperti di atas). Pastikan Variable `DATABASE_URL` di environment itu sudah ada (sudah dipakai deploy).

Tanpa langkah ini workflow `cek-skema.yml` gagal saat dijalankan. Tidak mempengaruhi deploy.

---

## Tahap 5. Klaim akun penghuni (tanpa kode)

Penghuni mendaftar sendiri di `/onboarding` dengan nomor kamar, nama, nomor HP, dan **email akun yang sama dengan email saat check-in**. Tidak ada kode yang perlu dibagikan. Data produksi sudah dicek: 29 dari 29 penghuni aktif punya email valid dan unik.

- [ ] Di dashboard Clerk, pastikan metode login **Email verification code** atau **Google** aktif. Penghuni dengan email UGM (2 orang) perlu kode email, kecuali akun Google mereka memakai alamat UGM itu.
- [ ] Beri tahu penghuni: masuk memakai email yang sama dengan saat check-in.
- [ ] **Kamar 2:** akunnya berstatus *revoked* sejak 11 Agustus 2026 (2 menit setelah klaim), sehingga penghuninya tidak bisa masuk. Kalau itu bukan disengaja, reset tautannya supaya bisa klaim ulang:
  ```bash
  npm run klaim:reset -- --kamar 2 --ya-ini-produksi
  ```
  Perintah ini menghapus tautan akun dan mematikan langganan push kamar itu. Pakai perintah yang sama kapan pun penghuni ganti akun atau akunnya perlu diputus.

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
  npx wrangler deploy --config cron-worker/wrangler.toml
  ```
  (dijalankan dari folder `teman-rara`; jangan `cd cron-worker` lalu `wrangler deploy` tanpa `--config`, karena bisa mengenai worker utama)
  Ini memasang perubahan cron: error dilempar saat gagal, peringatan Telegram, dan Workers Logs.

Jika ada masalah serius setelah deploy: `git revert` merge commit-nya lalu push. Tabel baru boleh dibiarkan.

---

## Tahap 7. Verifikasi setelah deploy (15 menit)

Pakai HP, bukan hanya laptop.

- [ ] **Telegram:** kirim satu pengaduan dari akun penghuni uji. Pesan "Pengaduan baru ..." muncul di grup pengelola.
- [ ] **Kompres foto:** unggah bukti bayar dengan foto langsung dari kamera (3 MB atau lebih). Harus berhasil tanpa pesan "terlalu besar".
- [ ] **Klaim akun:** dengan akun Clerk uji, buka `/onboarding`. Email yang tidak sama dengan data penghuni harus ditolak dengan pesan seragam. Email yang sama (terverifikasi) harus masuk ke `/kamar`.
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
