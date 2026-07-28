# teman-rara-cron

Cloudflare Worker kecil pengganti `crons` di `vercel.json`. Cloudflare **Pages**
tidak punya cron trigger native (itu fitur Workers), jadi endpoint
`/api/cron/harian` di aplikasi utama dipicu dari sini, bukan dari Pages
langsung.

Isinya cuma `fetch()` ke `/api/cron/harian` pakai header `Authorization`
yang sama seperti sebelumnya — logic cron tetap di aplikasi Next.js, tidak
dipindah ke sini.

## Setup

```bash
cd cron-worker
npm install
```

1. Deploy aplikasi utama ke Cloudflare Pages dulu, catat domainnya.
2. Update `CRON_TARGET_URL` di `wrangler.toml` sesuai domain produksi.
3. Set secret (jangan taruh di `wrangler.toml`, itu boleh masuk git):
   ```bash
   npx wrangler secret put CRON_SECRET
   ```
   Isi dengan nilai `CRON_SECRET` yang sama persis dengan yang dipakai
   aplikasi utama (lihat `.env` di root `teman-rara/`).
4. Deploy:
   ```bash
   npm run deploy
   ```

**Penting**: selalu pakai `npm run deploy`/`npm run dev` (bukan `npx wrangler deploy`
langsung), atau tambahkan `--config wrangler.toml` manual. Tanpa itu, fitur
"autoconfig" di Wrangler 4.x kadang salah mendeteksi dan malah men-deploy
config app utama (`../wrangler.jsonc`) alih-alih punya folder ini.

## Ganti jadwal

Edit `crons` di `wrangler.toml` (format cron standar, UTC, bukan WIB — WIB =
UTC+7). Default `*/15 * * * *` (tiap 15 menit). Aman untuk kedua job di
`/api/cron/harian`:

- `sinkronStatusPengaduan` — idempoten by design, push cuma terkirim kalau
  status pengaduan berubah dari catatan terakhir.
- `jalankanPengingatJatuhTempo` — dikirim di titik H-7/H-3/H-1/H/H+3/H+7 dari
  `periode_akhir`, di-guard tabel `tr_invoice_reminder_sync` (migrasi
  `db/migrations/005_pengingat_jatuh_tempo.sql`) supaya tidak dobel walau
  cron jalan berkali-kali di hari yang sama.

Batas Cloudflare: 5 cron trigger/akun (Free) / 250 (Paid) — bukan batas
"berapa kali sehari", tiap entri boleh sesering apa pun. Limit yang relevan
justru 100.000 request/hari (Free) — 96 invocation/hari (tiap 15 menit) jauh
di bawah itu.

## Cek jalan atau tidak

```bash
npx wrangler tail
```

lalu tunggu jadwal berikutnya, atau trigger manual dari dashboard Cloudflare
(Workers & Pages → teman-rara-cron → Triggers → Cron Triggers → "Trigger
manually" kalau tersedia di plan-mu).
