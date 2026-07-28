# Teman Rara

Web app mobile-first (PWA) untuk penghuni Kost Tiga Dara. Next.js + Drizzle + Turso.

Berbagi satu database Turso dengan aplikasi operasional di `D:\kost-tiga-dara`.

## Aturan pokok

Aplikasi ini **tidak boleh mengubah struktur tabel existing**. Semua tabel baru
berawalan `tr_` dan menempel ke tabel existing lewat foreign key.

Hak tulis Teman Rara ke tabel existing hanya dua:

- `INSERT` ke `tenant_complain` (pengaduan dari penghuni)
- `UPDATE` pada `active_tenant.email` dan `active_tenant.no_hp` (edit kontak)

Selain itu baca saja. Sumber kebenaran skema ada di `kost-tiga-dara/db/schema/`.

## Menjalankan lokal

Pengembangan memakai replika skema produksi di file SQLite, bukan Turso:

```bash
npm install
cp .env.example .env
npm run db:replika
npm run db:seed-uji
npm run db:seed
npm run dev
```

`db:replika` menjalankan snapshot skema existing lalu migrasi `003_teman_rara.sql`.
Keduanya menolak jalan kalau `DATABASE_URL` menunjuk ke Turso.

Uji integrasi lapisan data:

```bash
node --env-file=.env scripts/smoke-integrasi.mjs
```

## Peta data

| Yang dibaca Teman Rara | Dari tabel |
|---|---|
| Nama, kontak, tanggal masuk | `active_tenant` |
| Nomor kamar, tipe, tarif, fasilitas | `kamar` |
| Tagihan sewa dan jatuh tempo | `invoice_sewa` (`periode_akhir` = jatuh tempo) |
| Pelunasan dan cicilan | `payment` |
| Pengaduan dan statusnya | `tenant_complain` |

| Tabel `tr_` | Isi |
|---|---|
| `tr_kamar_wifi` | Kredensial WiFi per kamar, FK `id_kamar` |
| `tr_account` | Tautan akun Clerk ke `occupancy_history.id_penghuni` |
| `tr_payment_proof` | Bukti transfer yang diunggah penghuni |
| `tr_complain_photo` | Foto lampiran pengaduan |
| `tr_complain_sync` | Jejak status pengaduan yang sudah dinotifikasikan |
| `tr_information_board` | Peraturan dan pengumuman |
| `tr_push_subscription` | Langganan Web Push |
| `tr_notification_preference` | Preferensi notifikasi |

`tr_account` sengaja menempel ke `occupancy_history`, bukan `active_tenant`:
trigger `trg_booking_checkout_upd` menghapus baris `active_tenant` saat check-out,
sehingga tautan akun dan riwayat pengaduan akan ikut yatim.

## Siapa boleh punya akun

Hanya penghuni yang sedang tinggal. Pendaftar membuktikan diri dengan kombinasi
nomor kamar dan nomor HP yang cocok dengan `active_tenant`. Karena trigger
menghapus baris itu saat check-out, mantan penghuni otomatis tidak bisa mendaftar,
dan penghuni yang check-out kehilangan akses tanpa perlu langkah manual.

Pesan gagal sengaja disamakan untuk semua sebab, supaya tidak bisa dipakai
menebak kamar mana yang terisi. Percobaan dibatasi 5 kali per 15 menit per akun.

## Komunikasi dua arah

Dari sistem operasional ke Teman Rara berjalan tanpa sinkronisasi, karena
keduanya membaca tabel yang sama: invoice terbit, tarif berubah, check-in dan
check-out semuanya langsung terlihat.

Satu-satunya yang butuh mekanisme adalah perubahan status pengaduan, karena
`tenant_complain` tidak punya kolom `updated_at`. Cron `/api/cron/sinkron-pengaduan`
membandingkan status sekarang dengan `tr_complain_sync.last_status`, mengirim push
kalau berbeda, lalu memperbarui catatan. Pengelola tetap bekerja di dashboard
existing seperti biasa.

## Status pengaduan

Nilai baku di `settings`: Menunggu, Diproses, Selesai. Nilai lama `Review`
dinonaktifkan (bukan dihapus) dan ditampilkan sebagai "Menunggu" lewat
`normalisasiStatus()` di `src/lib/kategori.ts`.

Kategori mengikuti `CHECK(category)` di `tenant_complain` dan tidak boleh
menyimpang: Internet, Listrik, Air, AC, kebersihan, Keamanan, Fasilitas,
Pelayanan, Lainnya.

## Peran pengelola

Tandai akun di dashboard Clerk, Public metadata:

```json
{ "role": "pengelola" }
```

| Endpoint | Fungsi |
|---|---|
| `POST /api/announcements` | Pasang pengumuman atau peraturan, kirim push ke semua |
| `GET /api/cron/harian` | Gabungan sinkron pengaduan + pengingat jatuh tempo H-3 (auth: `CRON_SECRET`) |

Status pengaduan diubah lewat dashboard existing, bukan dari sini.

## Catatan produksi

- **Migrasi**: jalankan `db/migrations/003_teman_rara.sql` di Turso. Isinya hanya
  `CREATE TABLE IF NOT EXISTS` dan `INSERT ... ON CONFLICT DO NOTHING`, aman diulang.
- **Clerk**: isi `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` dan `CLERK_SECRET_KEY`.
  Aplikasi operasional sudah memakai Clerk, gunakan instance yang sama.
- **Web Push**: `npx web-push generate-vapid-keys`, isi `.env`.
- **Unggah berkas**: `src/lib/storage.ts` sudah upload ke Google Drive (service
  account, folder di-set lewat env `DRIVE_FOLDER_*`), bukan filesystem lokal —
  aman untuk platform serverless/edge apa pun.
- **Cron (`/api/cron/harian`)**: platform deploy tidak lagi otomatis
  menjadwalkan endpoint ini (Vercel `crons` di `vercel.json` sudah tidak
  dipakai). Kalau deploy ke Cloudflare Pages, jalankan Worker terpisah di
  `cron-worker/` (Cloudflare Pages tidak punya cron trigger native) — lihat
  `cron-worker/README.md` untuk setup.
- **Kredensial WiFi** disimpan apa adanya karena harus bisa ditampilkan ke penghuni.
  Aksesnya dibatasi per kamar, tapi kalau database bocor kredensial ikut terbaca.
