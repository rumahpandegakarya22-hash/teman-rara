# Arsitektur Teman Rara (kondisi 4 Nov 2026)

Dokumen ini menggantikan `LAPORAN-PENGERJAAN.md` (arsip per 23 Jul 2026, sebagian sudah usang: menyebut Vercel Cron dan `src/proxy.ts`).

## Komponen

| Bagian | Teknologi | Catatan |
|---|---|---|
| Aplikasi | Next.js 16 (App Router) di Cloudflare Workers via OpenNext | `middleware.ts` edge, bukan `proxy.ts` (OpenNext belum mendukung) |
| Cron | `cron-worker/` (Worker terpisah), tiap 15 menit | Memanggil `GET /api/cron/harian` dengan `CRON_SECRET`. Semua job harus idempoten |
| Auth | Clerk (penghuni) | Pengelola bekerja di Ops (instance Clerk berbeda) |
| Database | Turso (libSQL), **dibagi dengan aplikasi Ops** | Skema Ops dikelola di repo `kost-tiga-dara` |
| Berkas | Google Drive (OAuth refresh token), disajikan lewat `/api/berkas/[id]` | Tidak publik; cek kepemilikan sebelum stream |
| Push | Web Push (VAPID) | Hanya push yang aktif; email dan in-app belum ada |

## Hak tulis ke tabel milik Ops

Hanya yang ini (cek ulang dengan `grep -rnE "\.(insert|update|delete)\(" src`):

- `INSERT booking` (pendaftaran publik, status `Pending`)
- `INSERT tenant_complain`, dan `UPDATE tenant_complain.status` ke `Dibatalkan` (milik sendiri)
- `INSERT feedback`
- `UPDATE active_tenant` kolom `email` (hanya bila kosong) dan `no_hp`

Tabel baru berawalan `tr_`, dibuat lewat `db/migrations/NNN_*.sql` (aditif; dijalankan manual ke Turso).

## Migrasi

Urutan: `003` → `004` → `005` → `006` → `007` → `008_rate_limit`. Migrasi **dijalankan manual** di Turso sebelum kode yang memakainya di-deploy. `_replika_*` hanya untuk DB lokal/test.

## Pengujian

```bash
npm run typecheck && npm run lint && npm test
```

- Test memakai DB SQLite sementara yang dibangun dari `db/migrations/` (`tests/helpers/db-uji.ts`).
- CI (`.github/workflows/deploy.yml`) menjalankan ketiganya sebelum build dan deploy.
- `npm run db:cek-skema` membandingkan `src/db/schema.ts` dengan DB (mingguan lewat `cek-skema.yml`, token read-only).
- Skrip di `scripts/` yang menulis ke DB menolak jalan terhadap non-file kecuali `--ya-ini-produksi`.

## Keamanan yang berlaku

- Rate limit berbasis tabel `tr_rate_limit` (bukan memori): pendaftaran 3/jam/IP, ketersediaan 30/menit/IP, klaim akun 5/15 menit/akun dan 20/jam/IP, upload bukti 10/jam/penghuni. Fail-open bila DB gagal.
- IP dari `cf-connecting-ip` saja.
- Validasi berkas: ukuran 2 MB, tipe, dan magic bytes. Foto dikompres di browser.
- Service worker hanya menyimpan beranda publik dan aset statis.
- Dokumen internal hanya untuk penghuni aktif.
