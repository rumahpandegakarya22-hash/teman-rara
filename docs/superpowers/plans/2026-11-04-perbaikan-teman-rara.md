# Perbaikan Teman Rara — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menutup bug, lubang keamanan, dan celah proses yang ditemukan di audit, lalu menutup loop ke pengelola, supaya Teman Rara reliable dan hemat kerja manual.

**Architecture:** Tidak ada perubahan arsitektur besar. Pertama pasang jaring pengaman (lint, typecheck, test, CI gate), lalu perbaiki logika murni dengan TDD di test DB libSQL lokal yang dibangun dari `db/migrations/_replika_*.sql`. Setelah itu kontrol keamanan yang tahan di Workers (rate limit berbasis DB, bukan memori), terakhir fitur yang butuh keputusan pemilik (Telegram, kode klaim).

**Tech Stack:** Next.js 16, OpenNext Cloudflare, Drizzle + libSQL/Turso, Clerk, Vitest (baru), Playwright (baru), Telegram Bot API (Fase 3).

**Spec:** [`AUDIT-2026-11-04.md`](../../../AUDIT-2026-11-04.md). Kode temuan (A1…E7) di plan ini merujuk ke file itu.

## Global Constraints

Dari `APP SETUP/TECHNICAL BRIEF.md`, `CLAUDE.md`, dan `schema.ts`:

- **Wajib tanya pemilik sebelum:** install dependensi baru, ubah skema DB, ubah auth/otorisasi, ubah konfigurasi deploy/env, hapus kode. Tiap task di bawah yang menyentuh hal ini diberi label **[GATE]**: berhenti dan minta persetujuan sebelum eksekusi.
- Hak tulis Teman Rara ke tabel milik Ops hanya: `INSERT tenant_complain`, `UPDATE active_tenant.email` dan `.no_hp`. Tabel baru wajib berprefiks `tr_` dan lewat file di `db/migrations/` (aditif saja, tidak mengubah tabel existing).
- Komentar kode minimal, kecuali di bagian tidak umum bagi pemula. Bahasa identifier mengikuti kode existing (Indonesia).
- Satu task = satu commit. Pesan commit singkat, tanpa basa-basi, format `tipe(scope): ringkasan`.
- Jangan ubah nama kolom `tr_kamar_wifi.username` dan `occupancy_history.tanggal_selesasi` (typo `tanggal_selesasi` di schema.ts disengaja mengikuti DB).
- Zona waktu bisnis: WIB (UTC+7). Semua "hari ini" dan selisih hari memakai WIB.
- Perintah verifikasi standar setelah Task 1: `npm run typecheck && npm run lint && npm test`.

## Review Focus

Input atau kondisi yang tidak disebut audit tapi paling mungkin merusak, urut dari yang paling mungkin. Tiap baris punya test di task pemiliknya.

1. **Batas hari 00:00–07:00 WIB** (UTC masih hari kemarin): status tagihan, offset pengingat, validasi tanggal checkout. → Task 2.
2. **Penghuni punya dua invoice belum lunas** (satu lama, satu baru): tunggakan lama jangan hilang diam-diam. → Task 6.
3. **Foto HEIC atau file rusak yang tak bisa didecode canvas**: kompres gagal harus jatuh ke file asli, bukan memblokir upload. → Task 4.
4. **File berlabel `image/png` tapi isinya teks atau executable**. → Task 3.
5. **Request tanpa header `cf-connecting-ip`** (dev lokal, atau proxy aneh): tidak boleh membuka celah tanpa batas, tidak boleh mengunci semua orang di produksi. → Task 10.
6. **Cron jalan dua kali bersamaan** (retry Cloudflare): tidak boleh kirim notifikasi dobel. → Task 11 (verifikasi guard existing).

## Peta file

| File | Peran | Tindakan |
|---|---|---|
| `src/lib/waktu.ts` | Hari WIB, selisih hari, tambah hari | Baru |
| `src/lib/storage.ts` | Validasi berkas + upload Drive | Ubah |
| `src/lib/kompres-gambar.ts` | Kompres foto di browser | Baru |
| `src/lib/rate-limit.ts` | Rate limit berbasis DB | Baru |
| `src/lib/ip.ts` | Ambil IP klien dari header Cloudflare | Baru |
| `src/lib/tenant.ts`, `src/app/kamar/page.tsx` | Query tagihan, paralel | Ubah |
| `src/lib/jobs.ts`, `src/app/api/cron/harian/route.ts` | Cron: WIB, secret constant-time, peringatan gagal | Ubah |
| `src/app/onboarding/actions.ts` | Klaim akun | Ubah |
| `src/app/api/dokumen/[nama]/route.ts` | Otorisasi dokumen internal | Ubah |
| `public/sw.js` | Service worker | Ubah |
| `src/components/update-watcher.tsx` | Polling papan informasi | Ubah |
| `db/migrations/008_rate_limit.sql` | Tabel `tr_rate_limit` | Baru **[GATE]** |
| `tests/` , `vitest.config.ts`, `playwright.config.ts` | Infrastruktur test | Baru **[GATE]** |
| `scripts/cek-skema.mjs`, `scripts/_guard.mjs` | Deteksi drift skema, pengaman skrip | Baru |
| `.github/workflows/deploy.yml` | Gate CI sebelum deploy | Ubah **[GATE]** |

---

# FASE 0 — Jaring pengaman

### Task 0: Bersihkan working tree

**Files:** 5 file termodifikasi (`kamar/page.tsx`, `onboarding/page.tsx`, `pendaftaran/page.tsx`, `pengajuan/checkout/page.tsx`, `pengajuan/pindah/page.tsx`)

- [ ] **Step 1:** `git diff --stat` lalu `git diff` untuk kelimanya. Tulis ringkasan perubahan ke pemilik. Jangan menebak niatnya.
- [ ] **Step 2:** Tanya pemilik: commit apa adanya, stash, atau buang. Eksekusi sesuai jawaban.
- [ ] **Step 3:** `git status` bersih. Expected: `nothing to commit`.

### Task 1: Lint, typecheck, test runner, CI gate **[GATE: dependensi + deploy config]**

**Files:**
- Modify: `package.json`, `.github/workflows/deploy.yml`, `next.config.ts`
- Create: `eslint.config.mjs`, `vitest.config.ts`, `tests/stub-server-only.ts`, `tests/helpers/db-uji.ts`, `tests/smoke.test.ts`
- Delete: `vercel.json`

**Interfaces:**
- Produces: `buatDbUji(): Promise<LibsqlDatabase>` di `tests/helpers/db-uji.ts`. Membuat DB `file::memory:` baru, menjalankan `db/migrations/_replika_000.sql`, `_replika_001.sql`, lalu `003`–`007` (+ `008` setelah Task 10) berurutan. Dipakai semua test integrasi.
- Produces: script `npm run typecheck | lint | test`.

- [ ] **Step 1:** Minta persetujuan install devDependencies: `eslint`, `eslint-config-next`, `vitest`. Tampilkan alasan (A4, D1, D2).
- [ ] **Step 2:** Tambah script `"typecheck": "tsc --noEmit"`, `"lint": "eslint ."`, `"test": "vitest run"`. Buat `eslint.config.mjs` memakai preset `eslint-config-next` (flat config; cek dokumen Next 16 via Context7).
- [ ] **Step 3:** `vitest.config.ts`: alias `@` → `src`, alias `server-only` → `tests/stub-server-only.ts` (file kosong), `environment: "node"`.
- [ ] **Step 4:** Tulis test gagal `tests/smoke.test.ts`: `buatDbUji()` lalu `select count(*) from kamar` mengembalikan angka (bukan error), dan tabel `tr_account` ada. Jalankan, harus FAIL (helper belum ada).
- [ ] **Step 5:** Implement `buatDbUji`. Baca SQL dengan `fs`, jalankan per statement lewat `client.executeMultiple`. Jalankan `npm test`. Expected: PASS.
- [ ] **Step 6:** Perbaiki semua error `tsc` dan ESLint yang muncul. Jika banyak, perbaiki yang nyata dan turunkan aturan berisik menjadi `warn` (catat daftar warn di commit).
- [ ] **Step 7:** Hapus `vercel.json`. Hapus `outputFileTracingIncludes["/api/peraturan"]` di `next.config.ts` (route tidak ada). Jalankan `grep -rnE "@googleapis/drive|require\\(['\"]open['\"]\\)|from ['\"]open['\"]" src scripts cron-worker/src`; jika kosong, minta persetujuan hapus `@googleapis/drive` dan `open` dari `dependencies` (A9).
- [ ] **Step 8:** `deploy.yml`: tambah step `npm run typecheck`, `npm run lint`, `npm test` sebelum `opennextjs-cloudflare build`. Test CI: push ke branch, bukan `master`, dan pastikan job gagal bila sengaja merusak tipe (lalu kembalikan).
- [ ] **Step 9:** `npm run typecheck && npm run lint && npm test && npm run build`. Expected: semua exit 0.
- [ ] **Step 10:** Commit `chore: lint, typecheck, vitest, gate CI; hapus peninggalan vercel`.

**Rollback:** `git revert` commit ini. Tidak ada efek ke runtime produksi selain build gagal lebih awal.

---

# FASE 1 — Perbaikan murah dan pasti (bug A1–A8)

### Task 2: Modul waktu WIB (A5)

**Files:**
- Create: `src/lib/waktu.ts`, `tests/waktu.test.ts`
- Modify: `src/lib/jobs.ts`, `src/lib/tenant.ts`, `src/app/kamar/page.tsx`, `src/app/pengajuan/checkout/actions.ts`, `src/app/pengajuan/pindah/actions.ts`, `src/app/pendaftaran/actions.ts`, `src/app/pengaduan/actions.ts`

**Interfaces:**
- Produces: `hariIniWIB(sekarang?: Date): string` → `"YYYY-MM-DD"`; `selisihHari(dari: string, ke: string): number` (ke − dari, hari bulat); `tambahHari(tanggal: string, n: number): string`.
- `pendaftaran/actions.ts` sudah punya `tambahHari` privat; pindahkan ke modul ini, jangan duplikat.

- [ ] **Step 1:** Test gagal di `tests/waktu.test.ts`:
  - `hariIniWIB(new Date("2026-11-04T16:59:00Z")) === "2026-11-04"`
  - `hariIniWIB(new Date("2026-11-04T17:00:00Z")) === "2026-11-05"`
  - `selisihHari("2026-11-04", "2026-11-11") === 7`; `selisihHari("2026-11-11", "2026-11-04") === -7`
  - `tambahHari("2026-12-31", 1) === "2027-01-01"`
- [ ] **Step 2:** `npx vitest run tests/waktu.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. `hariIniWIB` = geser epoch +7 jam lalu `toISOString().slice(0,10)`. Selisih dihitung dari dua tanggal `T00:00:00Z`.
- [ ] **Step 4:** Ganti SEMUA `new Date().toISOString().slice(0, 10)` dan `Date.now() ± n*86_400_000` di file yang tercantum. Perbaiki `sisaHari` di `kamar/page.tsx` dan `selisihHari` privat di `jobs.ts` agar memakai modul baru. Cari sisa: `grep -rn "toISOString().slice(0, 10)" src`. Expected: hanya tersisa untuk timestamp, bukan tanggal bisnis.
- [ ] **Step 5:** `npm run typecheck && npm test`. PASS.
- [ ] **Step 6:** Commit `fix(waktu): hitung hari bisnis dengan WIB`.

### Task 3: Validasi berkas yang jujur (A1, B3)

**Files:**
- Modify: `src/lib/storage.ts`
- Create: `tests/storage.test.ts`
- Modify: `src/app/pendaftaran/actions.ts`, `src/app/kamar/actions.ts`, `src/app/pengaduan/actions.ts` (ganti pemanggil)

**Interfaces:**
- Produces: `validasiBerkas(file: File): Promise<HasilValidasi>`. Menggantikan `validasiGambar` dan `validasiDokumen` (hapus keduanya). Aturan tunggal: JPG, PNG, PDF; maks `UKURAN_MAKS` (2 MB). Pesan error memakai nilai konstanta, bukan angka tertulis. Verifikasi **magic bytes**: JPEG `FF D8 FF`, PNG `89 50 4E 47`, PDF `25 50 44 46`.

- [ ] **Step 1:** Test gagal:
  - file `new File([pngBytes], "a.png", {type:"image/png"})` → `ok: true`
  - `new File(["bukan gambar"], "a.png", {type:"image/png"})` → `ok: false`
  - 2 MB + 1 byte → `ok: false`, `pesan` mengandung `"2 MB"`
  - 0 byte → `ok: false`
  - `{type:"image/webp"}` → `ok: false`, `pesan` tidak menyebut WebP sebagai format yang boleh
- [ ] **Step 2:** Jalankan; FAIL.
- [ ] **Step 3:** Implement `validasiBerkas`: cek ukuran, cek `file.type`, baca 4 byte pertama via `file.slice(0,4).arrayBuffer()`, cocokkan dengan tipe yang diklaim.
- [ ] **Step 4:** Ganti 3 pemanggil. Hapus fungsi lama.
- [ ] **Step 5:** `npm run typecheck && npm test`. PASS.
- [ ] **Step 6:** Commit `fix(storage): validasi magic bytes dan pesan ukuran jujur`.

### Task 4: Kompres foto di klien (E5)

**Files:**
- Create: `src/lib/kompres-gambar.ts`, `tests/kompres-gambar.test.ts`
- Modify: `src/components/upload-bukti.tsx`, `src/components/form-pengaduan.tsx`, `src/components/form-pendaftaran.tsx`

**Interfaces:**
- Produces: `kompresGambar(file: File, opsi?: { sisiMaks?: number; kualitas?: number }): Promise<File>`. Default `sisiMaks=1600`, `kualitas=0.8`. Mengembalikan JPEG baru bila `file.type` ∈ {jpeg, png} dan hasil lebih kecil dari asli. **PDF, tipe lain, dan kegagalan decode mengembalikan `file` asli tanpa melempar error** (Review Focus 3).
- Consumes: Task 3 (server tetap memvalidasi hasilnya).

- [ ] **Step 1:** Test gagal (environment `node`, dengan dependensi `OffscreenCanvas`/`createImageBitmap` di-mock lewat parameter injeksi `deps` opsional agar bisa dites):
  - PDF masuk → mengembalikan objek `File` yang sama
  - decoder melempar error → mengembalikan file asli
  - hasil kompres lebih besar dari asli → mengembalikan file asli
- [ ] **Step 2:** Jalankan; FAIL.
- [ ] **Step 3:** Implement memakai `createImageBitmap` + `OffscreenCanvas` (fallback `<canvas>`), `convertToBlob({type:"image/jpeg", quality})`.
- [ ] **Step 4:** Di tiga komponen, kompres di `onChange` input file, lalu tulis kembali ke input lewat `DataTransfer`. Tampilkan pratinjau dari file hasil. Jaga perilaku pratinjau dan hapus-foto yang sudah ada.
- [ ] **Step 5:** `npm test`. PASS. Verifikasi manual di browser (preview): unggah JPEG 4 MB, ukuran akhir < 2 MB, upload sukses. Catat hasil di commit.
- [ ] **Step 6:** Commit `feat(upload): kompres foto di klien sebelum kirim`.

### Task 5: Email klaim tidak menimpa data Ops (A2)

**Files:**
- Modify: `src/app/onboarding/actions.ts:95-100`
- Create: `tests/klaim-email.test.ts`

**Interfaces:**
- Produces (refaktor kecil agar bisa dites): `isiEmailKosong(idPenghuni: string, email: string): Promise<boolean>` di file yang sama atau `src/lib/tenant-write.ts`; mengembalikan `true` bila ada baris yang di-update.

- [ ] **Step 1:** Test gagal dengan `buatDbUji()`: penghuni A email `null` → setelah panggilan email terisi dan return `true`; penghuni B email `"lama@x.com"` → tetap `"lama@x.com"`, return `false`; email `""` diperlakukan kosong.
- [ ] **Step 2:** Jalankan; FAIL.
- [ ] **Step 3:** Implement dengan `UPDATE … WHERE id_penghuni=? AND (email IS NULL OR email='')` dan `.returning()`.
- [ ] **Step 4:** Pakai fungsi itu di `klaimAkun`. `npm test`. PASS.
- [ ] **Step 5:** Commit `fix(onboarding): isi email hanya bila kosong`.

### Task 6: Query tagihan paralel dan tunggakan lama tidak hilang (C1, A8)

**Files:**
- Modify: `src/lib/tenant.ts`, `src/app/kamar/page.tsx`
- Create: `tests/tagihan.test.ts`

**Interfaces:**
- Produces: `getTagihanTerbaru(idPenghuni: string)` tetap bentuk keluaran sekarang, tapi `dibayar` dihitung dalam **satu query** (subquery `SUM(payment.amount)` per invoice). Tambah `getTunggakanLama(idPenghuni: string): Promise<{ id:number; no_inv:string; periode_akhir:string; sisa:number }[]>`: invoice **selain yang terbaru** dengan `tanggal_pembayaran IS NULL` dan `periode_akhir < hariIniWIB()`.
- Consumes: Task 2 (`hariIniWIB`).

- [ ] **Step 1:** Test gagal (Review Focus 2) dengan `buatDbUji()`:
  - invoice lunas (`tanggal_pembayaran` terisi) → `status: "lunas"`
  - invoice 1.000.000, payment Paid 400.000 → `status: "sebagian"`, `sisa: 600000`
  - dua invoice (lama belum lunas, jatuh tempo lewat; baru belum jatuh tempo) → `getTunggakanLama` mengembalikan invoice lama, `getTagihanTerbaru` mengembalikan yang baru
  - payment berstatus `Pending`/`Cancelled` tidak dihitung
- [ ] **Step 2:** Jalankan; FAIL.
- [ ] **Step 3:** Implement. Di `kamar/page.tsx` jalankan `getTagihanTerbaru`, `getTunggakanLama`, `getRiwayatBukti` dengan `Promise.all`.
- [ ] **Step 4:** Tampilkan tunggakan lama sebagai blok peringatan di `DetailTagihan` area (teks: "Tagihan sebelumnya belum lunas: {no_inv} sebesar {sisa}"). **Tanyakan pemilik dulu** soal pertanyaan #4 audit (apakah Ops membuat invoice baru saat yang lama belum lunas). Bila tidak pernah terjadi, hentikan di sini dan buang `getTunggakanLama` (YAGNI).
- [ ] **Step 5:** `npm run typecheck && npm test`. PASS.
- [ ] **Step 6:** Commit `perf(kamar): query tagihan paralel; tampilkan tunggakan lama`.

### Task 7: Otorisasi dokumen internal + HSTS (A6, B4)

**Files:**
- Modify: `src/app/api/dokumen/[nama]/route.ts`, `next.config.ts`
- Create: `tests/dokumen-route.test.ts`

- [ ] **Step 1:** Test gagal dengan mock `@/lib/tenant` dan `@/lib/google`: `getPenghuniAktif()` → `null` menghasilkan status 403; penghuni aktif + nama valid → lolos ke Drive (mock fetch 200) menghasilkan 200; nama tidak dikenal → 404 tanpa memanggil auth.
- [ ] **Step 2:** Jalankan; FAIL.
- [ ] **Step 3:** Ganti `auth()` + `userId` dengan `getPenghuniAktif()`; tamu tetap 401 bila tidak ada sesi sama sekali, 403 bila login tapi bukan penghuni aktif. **[GATE: otorisasi]** minta persetujuan sebelum merge.
- [ ] **Step 4:** Tambah header `Strict-Transport-Security: max-age=31536000; includeSubDomains` di `next.config.ts`. CSP **tidak** ditambahkan di plan ini (Clerk dan inline script Next butuh daftar sumber yang diuji; jadi pekerjaan terpisah).
- [ ] **Step 5:** `npm test`. PASS.
- [ ] **Step 6:** Commit `fix(dokumen): hanya penghuni aktif; tambah HSTS`.

### Task 8: Service worker tidak menyimpan halaman privat (A7)

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1:** Ubah `CACHE` ke `"teman-rara-v2"` (handler `activate` yang sudah ada menghapus cache v1, termasuk halaman privat yang terlanjur tersimpan).
- [ ] **Step 2:** Navigasi: hanya cache jika `new URL(request.url).pathname === "/"` (beranda publik). Navigasi lain: network-only, jatuh ke `/offline.html` saat gagal. Aset statis `/_next/static/` dan `/icons/` tetap cache-first.
- [ ] **Step 3:** Verifikasi di `npm run preview` (Workers lokal): buka `/`, `/kamar`; di DevTools → Application → Cache Storage, hanya `/`, shell, dan aset statis yang ada; tidak ada `/kamar`. Kembali offline: `/kamar` menampilkan `offline.html`. Tempel hasil ke commit.
- [ ] **Step 4:** Commit `fix(sw): jangan cache halaman privat; naik ke v2`.

**Rollback:** revert; tapi cache v2 pengguna tetap bersih. Aman.

### Task 9: Polling papan informasi hemat (C3)

**Files:**
- Modify: `src/components/update-watcher.tsx`
- Create: `tests/e2e/update-watcher.spec.ts` (setelah Task 14; sementara verifikasi manual)

- [ ] **Step 1:** Ubah `POLL_MS` ke `300_000` (5 menit). Polling hanya saat `document.visibilityState === "visible"`. Saat tab kembali terlihat (`visibilitychange`), cek segera sekali. Hapus interval saat tab tersembunyi.
- [ ] **Step 2:** Verifikasi di browser preview: dengan tab tersembunyi tidak ada request ke `/api/board/recent-updates` selama 6 menit (`read_network_requests`); saat tab difokuskan, 1 request langsung muncul.
- [ ] **Step 3:** Commit `perf(watcher): polling 5 menit dan hanya saat tab terlihat`.

---

# FASE 2 — Pertahanan dan keandalan

### Task 10: Rate limit berbasis DB (B2) **[GATE: skema + auth]**

Rate limit di memori tidak bekerja di Workers, jadi diganti tabel di Turso. Dipilih daripada Cloudflare Rate Limiting binding karena bisa dites lokal dan perilakunya deterministik lintas isolate. Kekurangan: 1 tulis per percobaan (dapat diterima di skala ini).

**Files:**
- Create: `db/migrations/008_rate_limit.sql`, `src/lib/rate-limit.ts`, `src/lib/ip.ts`, `tests/rate-limit.test.ts`, `tests/ip.test.ts`
- Modify: `src/db/schema.ts` (tambah `trRateLimit`), `tests/helpers/db-uji.ts` (muat 008), `src/app/pendaftaran/actions.ts`, `src/app/onboarding/actions.ts`, `src/app/kamar/actions.ts`, `src/lib/jobs.ts`

**Interfaces:**
- Migrasi: `CREATE TABLE IF NOT EXISTS tr_rate_limit (kunci TEXT NOT NULL, jendela INTEGER NOT NULL, jumlah INTEGER NOT NULL, PRIMARY KEY (kunci, jendela))`. Aditif, tidak menyentuh tabel Ops.
- `cobaPakai(kunci: string, maks: number, jendelaDetik: number, sekarangMs?: number): Promise<{ ok: boolean; sisa: number }>`. Satu statement atomik: `INSERT … ON CONFLICT(kunci,jendela) DO UPDATE SET jumlah = jumlah + 1 RETURNING jumlah`. `jendela = floor(sekarangMs / (jendelaDetik*1000))`. `ok = jumlah <= maks`.
- `bersihkanRateLimit(sekarangMs?: number, umurDetik = 86_400): Promise<number>` hapus jendela lama; dipanggil dari `jalankan…` di cron.
- `ambilIp(h: Headers): string`: `cf-connecting-ip`; bila tidak ada → `"tak-dikenal"` (satu bucket bersama; di produksi header ini selalu ada, di dev lokal bucket longgar ditoleransi). **Jangan** pakai `x-forwarded-for` (Review Focus 5).

- [ ] **Step 1:** **Minta persetujuan** skema baru `tr_rate_limit` dan tunjukkan SQL-nya.
- [ ] **Step 2:** Test gagal `tests/rate-limit.test.ts` dengan `buatDbUji()`:
  - `maks=3`: panggilan 1–3 `ok`, ke-4 `ok:false`
  - kunci beda tidak saling mempengaruhi
  - `sekarangMs` bergeser ke jendela berikutnya → `ok:true` lagi
  - 10 panggilan paralel `Promise.all` dengan `maks=5` → tepat 5 yang `ok` (atomik)
  - `bersihkanRateLimit` menghapus baris lama, mempertahankan yang baru
- [ ] **Step 3:** Test gagal `tests/ip.test.ts`: header `cf-connecting-ip: 1.2.3.4` → `"1.2.3.4"`; hanya `x-forwarded-for: 9.9.9.9` → `"tak-dikenal"`; tanpa header → `"tak-dikenal"`.
- [ ] **Step 4:** Jalankan; FAIL. Implement migrasi, `schema.ts`, `rate-limit.ts`, `ip.ts`. Jalankan; PASS.
- [ ] **Step 5:** Pasang di aksi (hapus `Map` lama di `pendaftaran` dan `onboarding`). Batas dan kunci:
  - `kirimPendaftaran`: `pendaftaran:{ip}` 3 per 3600 s
  - `cekKetersediaan`: `ketersediaan:{ip}` 30 per 60 s
  - `klaimAkun`: `klaim-user:{userId}` 5 per 900 s **dan** `klaim-ip:{ip}` 20 per 3600 s
  - `unggahBukti`: `bukti:{id_penghuni}` 10 per 3600 s (menutup upload tak terbatas)
  - Pesan error tetap Indonesia dan sama dengan teks lama.
- [ ] **Step 6:** Panggil `bersihkanRateLimit()` di akhir `jalankanPengingatJatuhTempo` (atau job baru kecil) agar tabel tidak membengkak.
- [ ] **Step 7:** `npm run typecheck && npm test`. PASS.
- [ ] **Step 8:** Commit `feat(keamanan): rate limit berbasis DB menggantikan memori`.
- [ ] **Step 9 (Manual action):** pemilik menjalankan `008_rate_limit.sql` ke Turso produksi **sebelum** deploy kode ini (kode memakai tabel itu).

**Rollback:** revert kode; tabel boleh dibiarkan (tidak mengganggu).

### Task 11: Cron: secret constant-time, peringatan kegagalan, verifikasi idempoten (D3, Review Focus 6)

**Files:**
- Modify: `src/app/api/cron/harian/route.ts`, `cron-worker/src/index.ts`, `src/lib/jobs.ts`
- Create: `tests/cron-route.test.ts`, `tests/jobs-idempoten.test.ts`

**Interfaces:**
- Produces: `cocokSecret(diberi: string | null, benar: string | undefined): boolean` (constant-time) di `src/lib/cron-auth.ts`.

- [ ] **Step 1:** Test gagal `tests/cron-route.test.ts`: tanpa header → 401; secret salah (panjang sama dan beda) → 401; secret benar dengan job di-mock → 200; satu job melempar error → 500 dan job lain tetap dijalankan.
- [ ] **Step 2:** Test gagal `tests/jobs-idempoten.test.ts` dengan `buatDbUji()` dan `kirimKePenghuni` di-mock: satu invoice H-3 belum lunas; `jalankanPengingatJatuhTempo()` dipanggil dua kali **paralel** → `kirimKePenghuni` dipanggil tepat 1 kali. Tambah kasus batas WIB (Task 2) untuk invoice dengan `periode_akhir` = lusa pada pukul 18:00 UTC.
- [ ] **Step 3:** Jalankan; FAIL (untuk yang belum ada). Implement `cocokSecret` dan pakai di route. Bila test idempoten paralel gagal, perbaiki jobs (guard sudah memakai primary key; test ini memastikannya).
- [ ] **Step 4:** `cron-worker`: bila `!res.ok` lempar `Error` (supaya invocation tercatat gagal di Cloudflare) selain `console.error`. Konten alert ke pemilik ditambahkan di Task 17 (butuh kanal).
- [ ] **Step 5:** Perjelas komentar di route: endpoint dipanggil tiap 15 menit, bukan harian (jangan ganti path agar `CRON_TARGET_URL` tidak putus).
- [ ] **Step 6:** `npm test`. PASS.
- [ ] **Step 7:** Commit `fix(cron): secret constant-time; gagal tercatat; test idempoten`.

### Task 12: Observability **[GATE: konfigurasi deploy]**

**Files:** Modify `wrangler.jsonc`, `cron-worker/wrangler.toml`

- [ ] **Step 1:** Minta persetujuan. Tambah `"observability": { "enabled": true }` di `wrangler.jsonc` dan `[observability] enabled = true` di `cron-worker/wrangler.toml` (cek sintaks via Context7 dokumen Wrangler).
- [ ] **Step 2:** Deploy dari branch uji bila memungkinkan; buka Workers Logs di dashboard Cloudflare, pastikan log `console.error` dari cron muncul.
- [ ] **Step 3:** Commit `chore(obs): aktifkan Workers Logs`.

### Task 13: Deteksi drift skema Ops ↔ Teman Rara (C7, D4)

**Files:**
- Create: `scripts/cek-skema.mjs`, `tests/cek-skema.test.ts`, `.github/workflows/cek-skema.yml`

**Interfaces:**
- Produces: `bandingkanSkema(client): Promise<{ tabel: string; hilang: string[] }[]>` (diekspor dari `scripts/cek-skema.mjs` atau `src/lib/cek-skema.ts`). Untuk tiap tabel di `schema.ts` (via `getTableConfig`), jalankan `PRAGMA table_info(tabel)` dan laporkan kolom yang ada di `schema.ts` tapi tidak di DB.

- [ ] **Step 1:** Test gagal: pada `buatDbUji()` hasilnya `[]`; setelah `ALTER TABLE active_tenant DROP COLUMN no_hp` hasil memuat `{tabel:"active_tenant", hilang:["no_hp"]}`.
- [ ] **Step 2:** Jalankan; FAIL. Implement; PASS. Skrip CLI keluar dengan kode 1 bila ada selisih.
- [ ] **Step 3:** Workflow `cek-skema.yml`: `schedule` mingguan + `workflow_dispatch`, memakai `DATABASE_URL` dan token **read-only** Turso (**minta pemilik membuat token read-only**; jangan memakai token tulis).
- [ ] **Step 4:** Commit `feat(ci): cek drift skema mingguan`.

### Task 14: Pengaman skrip dan E2E dasar **[GATE: dependensi Playwright]**

**Files:**
- Create: `scripts/_guard.mjs`, `playwright.config.ts`, `tests/e2e/*.spec.ts`, `tests/e2e/fake-drive.mjs`
- Modify: `scripts/dummy-anindya.mjs`, `scripts/seed-uji.mjs`, `scripts/cek-data-produksi.mjs`, `src/lib/google.ts`, `src/lib/storage.ts`

**Interfaces:**
- Produces: `wajibIzinProduksi(): void` di `scripts/_guard.mjs`; keluar dengan error bila `DATABASE_URL` memuat `turso.io` dan argumen `--ya-ini-produksi` tidak ada.
- Produces: `GOOGLE_TOKEN_URL` dan `DRIVE_API_BASE` dibaca dari env dengan default produksi (satu-satunya perubahan kode produksi untuk testabilitas; E2E mengarahkannya ke `fake-drive.mjs` lokal).

- [ ] **Step 1:** Pasang `wajibIzinProduksi()` di tiga skrip. Uji: jalankan dengan `DATABASE_URL=libsql://x.turso.io` tanpa flag → exit 1.
- [ ] **Step 2:** Minta persetujuan install `@playwright/test`. Konfigurasi `webServer: npm run dev` dengan `DATABASE_URL=file:tests/.e2e.db`, `DEV_BYPASS_AUTH=1`, env Drive menunjuk `fake-drive.mjs`. Seed DB dari `buatDbUji()` ditambah satu `tr_account` dan satu invoice. **Catatan risiko:** `clerkMiddleware` di dev butuh key Clerk; bila mode keyless tidak jalan tanpa jaringan, pakai key dev Clerk dari `.env.local` (jangan commit).
- [ ] **Step 3:** Spec yang harus lulus (satu file per alur):
  - `kamar.spec.ts`: halaman `/kamar` menampilkan nama dan nomor kamar
  - `bukti.spec.ts`: unggah JPEG 4 MB (fixture dibuat saat tes) → pesan sukses, baris baru di `tr_payment_proof`
  - `pengaduan.spec.ts`: kirim pengaduan dengan 1 foto → redirect ke `/pengaduan/CMP-…`
  - `pendaftaran.spec.ts`: form publik lengkap → `/pendaftaran/terkirim?no=BK-…`; kiriman ke-4 dari IP sama ditolak
  - `update-watcher.spec.ts` (Task 9): dengan `page.clock`, tab tersembunyi tidak polling
- [ ] **Step 4:** `npx playwright test`. Expected: semua PASS.
- [ ] **Step 5:** Tambah `npm run test:e2e`; jalankan di CI sebagai job terpisah (tidak memblokir deploy dulu, dijadikan blocking setelah stabil seminggu).
- [ ] **Step 6:** Commit `test(e2e): alur kritis penghuni; pengaman skrip produksi`.

### Task 15: Toggle notifikasi yang tak berfungsi + dokumen (A3, A10) **[GATE: hapus kode]**

**Files:** Modify `src/components/pengaturan-notifikasi.tsx`, `src/app/profil/page.tsx`, `LAPORAN-PENGERJAAN.md`, `README.md`; Create `docs/ARSITEKTUR.md`

- [ ] **Step 1:** Rekomendasi: sembunyikan toggle **email** dan **in-app** di UI (kolom DB dibiarkan) sampai fiturnya ada. Minta persetujuan pemilik (alternatif: biarkan dan beri label "segera hadir").
- [ ] **Step 2:** Tambah banner "ARSIP, kondisi per 23 Jul 2026; lihat `docs/ARSITEKTUR.md`" di atas `LAPORAN-PENGERJAAN.md`. Jangan menulis ulang isinya.
- [ ] **Step 3:** `docs/ARSITEKTUR.md` (maks 1 halaman): hosting Workers + cron-worker 15 menit, Clerk, Turso bersama Ops, Drive, daftar tabel `tr_`, aturan hak tulis, cara menjalankan test, urutan migrasi manual. Jalankan ulang graphify (`graphify update .`) agar `graphify-out/` sinkron.
- [ ] **Step 4:** Commit `docs: arsitektur terkini; sembunyikan toggle belum berfungsi`.

---

# FASE 3 — Fitur bernilai besar (butuh keputusan; jangan mulai sebelum dijawab)

Dasar rekomendasi di bawah mengikuti audit. Ganti bila pemilik memilih opsi lain.

### Task 16: Notifikasi pengelola via Telegram (E1) **[GATE: env + dependensi eksternal; keputusan #1]**

**Files:**
- Create: `src/lib/telegram.ts`, `tests/telegram.test.ts`
- Modify: `src/lib/push.ts` (isi `kirimKePengelola`), `src/app/pendaftaran/actions.ts`, `src/app/kamar/actions.ts`, `src/app/pengaduan/actions.ts`, `src/lib/jobs.ts`, `cron-worker/src/index.ts`, `.github/workflows/deploy.yml`

**Interfaces:**
- `kirimTelegram(teks: string): Promise<{ ok: boolean }>`: `POST https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage` dengan `chat_id=TELEGRAM_CHAT_ID`, `parse_mode=HTML`. Teks dari input pengguna **wajib di-escape** (`& < >`). Tidak pernah melempar; gagal → `{ok:false}` + `console.error`.
- `kirimKePengelola(isi: IsiNotifikasi)` **mempertahankan signature**, isinya diganti memanggil `kirimTelegram` (komentar existing sudah merencanakan ini). Hapus ketergantungan `PENGELOLA_ID_PENGHUNI`.

- [ ] **Step 1:** Pemilik membuat bot via @BotFather dan memberi `chat_id` grup/pribadi (**Manual action**). Token jadi *secret* Cloudflare (`wrangler secret put TELEGRAM_BOT_TOKEN`), `TELEGRAM_CHAT_ID` jadi GitHub Variable.
- [ ] **Step 2:** Test gagal dengan `fetch` di-mock: payload berisi `chat_id`; nama berisi `<b>` ter-escape; respons 500 → `{ok:false}` tanpa throw; env kosong → `{ok:false}`, tidak ada fetch.
- [ ] **Step 3:** Jalankan; FAIL. Implement; PASS.
- [ ] **Step 4:** Panggil `kirimKePengelola` (best-effort, tidak membatalkan transaksi utama) setelah: pendaftaran terkirim ("Pendaftaran baru: {nama}, kamar {no}, masuk {tanggal}"), bukti bayar diunggah, pengaduan baru, dan (sudah ada) pengajuan checkout/pindah.
- [ ] **Step 5:** Cron: bila salah satu job gagal, kirim "Cron Teman Rara gagal: {nama job}". Di `cron-worker`, saat respons bukan 2xx, kirim peringatan langsung ke Telegram sebagai cadangan.
- [ ] **Step 6:** `npm test`. PASS. Uji manual: kirim satu pengaduan di staging dan konfirmasi pesan sampai.
- [ ] **Step 7:** Commit `feat(notif): notifikasi pengelola lewat Telegram`.

### Task 17: Kode klaim akun (E4, menutup B1) **[GATE: skema + auth; keputusan #2]**

Opsi A dipilih sebagai rekomendasi (tanpa biaya gateway). Bila pemilik memilih OTP WhatsApp, task ini diganti plan terpisah.

**Files:**
- Create: `db/migrations/009_kode_klaim.sql`, `src/lib/kode-klaim.ts`, `tests/kode-klaim.test.ts`, `scripts/buat-kode-klaim.mjs`, `scripts/reset-klaim.mjs`
- Modify: `src/db/schema.ts`, `src/app/onboarding/actions.ts`, `src/components/onboarding-form.tsx`

**Interfaces:**
- Tabel `tr_claim_code(id_penghuni TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`. Kode disimpan sebagai SHA-256, bukan teks asli.
- `buatKodeKlaim(idPenghuni: string): Promise<string>`: kode 8 karakter dari alfabet tanpa karakter ambigu (tanpa `0 O 1 I l`), dari `crypto.getRandomValues`; berlaku 30 hari; menimpa kode lama.
- `pakaiKodeKlaim(idPenghuni: string, kode: string): Promise<boolean>`: bandingkan hash constant-time; `false` bila salah, kedaluwarsa, atau sudah dipakai; `true` menandai `used_at` secara atomik (`UPDATE … WHERE used_at IS NULL`).
- `klaimAkun` mensyaratkan kamar + HP + kode, ketiganya. Pesan gagal tetap seragam.

- [ ] **Step 1:** Minta persetujuan skema dan perubahan auth. Tunjukkan alur ke pemilik.
- [ ] **Step 2:** Test gagal: kode benar sekali pakai `true`, pemakaian kedua `false`; kode salah `false`; kedaluwarsa `false`; dua pemakaian paralel dengan kode benar → tepat satu `true`; format kode hanya memuat alfabet yang diizinkan.
- [ ] **Step 3:** Jalankan; FAIL. Implement; PASS.
- [ ] **Step 4:** `scripts/buat-kode-klaim.mjs`: membuat kode untuk semua penghuni aktif yang belum punya `tr_account`, mencetak tabel (kamar, nama, kode) ke stdout untuk dicetak jadi kartu. Pakai `wajibIzinProduksi()` dari Task 14. `scripts/reset-klaim.mjs <no_kamar>`: mengisi `tr_account.revoked_at` agar penghuni sah bisa klaim ulang bila akunnya dibajak.
- [ ] **Step 5:** Tambah field kode di `onboarding-form.tsx`; terapkan rate limit Task 10 yang sudah ada.
- [ ] **Step 6:** E2E: klaim dengan kode benar → `/kamar`; kode salah → pesan seragam.
- [ ] **Step 7:** Commit `feat(klaim): kode klaim sekali pakai`.
- [ ] **Step 8 (Manual action):** jalankan `009` di Turso; cetak dan bagikan kode ke 30 penghuni Properti A; buat prosedur: kode baru dibuat saat check-in.

---

## Di luar plan ini (butuh plan sendiri)

- **E2** pengingat WhatsApp: tunggu keputusan kanal (#1) dan template pesan.
- **E3** rekonsiliasi pembayaran (QRIS/VA + webhook): menyentuh Ops dan memberi hak tulis `payment`. Perlu brainstorming terpisah.
- **E6** laporan bulanan otomatis dan **E7** pendaftaran → check-in tanpa input ulang: sebagian besar perubahan di repo Ops.
- **CSP**: perlu inventarisasi sumber Clerk dan skrip inline Next.
- **B5** status OAuth Drive: bukan perubahan kode; pemilik cek di Google Cloud Console (OAuth consent screen: *Testing* atau *In production*). Lakukan hari ini, tidak perlu menunggu plan.

## Urutan dan ketergantungan

```
Task 0 → Task 1 ─┬→ Task 2 → Task 6, 11
                 ├→ Task 3 → Task 4
                 ├→ Task 5, 7, 8, 9 (bebas, paralel)
                 ├→ Task 10 → Task 14 (e2e rate limit) → Task 17
                 ├→ Task 12, 13, 15 (bebas)
                 └→ Task 16 (setelah keputusan #1) → Task 11 step alert
```

Perkiraan: Fase 0–1 sekitar 1–2 hari kerja, Fase 2 sekitar 2–3 hari, Fase 3 sekitar 2 hari per fitur setelah keputusan.

## Self-review

- **Cakupan audit:** A1→T3, A2→T5, A3→T15, A4→T1, A5→T2, A6→T7, A7→T8, A8→T6, A9→T1, A10→T15; B1→T17, B2→T10, B3→T3, B4→T7 (HSTS; CSP ditunda eksplisit), B5→di luar plan (aksi pemilik), B6 (retensi KTP) **belum ada task**: butuh keputusan kebijakan (berapa lama disimpan) sebelum dibuat task hapus-otomatis; C1→T6, C3→T9, C7→T13; D1–D6→T1, T11, T12, T13, T14, T0; E1→T16, E4→T17, E5→T4.
- **Konsistensi tipe:** `hariIniWIB`, `selisihHari`, `tambahHari` dipakai T2, T6, T11. `buatDbUji` dari T1 dipakai T5, T6, T10, T11, T13. `kirimKePengelola` mempertahankan signature (T16). `wajibIzinProduksi` dari T14 dipakai T17.
- **Skema baru:** hanya `tr_rate_limit` (008) dan `tr_claim_code` (009), keduanya aditif dan berprefiks `tr_`.
