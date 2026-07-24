import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = sql`(CURRENT_TIMESTAMP)`;

/* ==========================================================================
 * TABEL EXISTING (milik aplikasi Kost Tiga Dara)
 *
 * Definisi di bawah hanya memetakan tabel yang sudah ada di Turso. Strukturnya
 * TIDAK dikelola dari sini: jangan pernah membuat migrasi yang mengubahnya.
 * Sumber kebenaran skema ada di kost-tiga-dara/db/schema/.
 *
 * Hak tulis Teman Rara terbatas pada:
 *   - INSERT ke tenant_complain (pengaduan dari penghuni)
 *   - UPDATE active_tenant.email dan active_tenant.no_hp (edit profil)
 * Selain itu baca saja.
 * ========================================================================== */

export const kamar = sqliteTable("kamar", {
  id_kamar: text("id_kamar").primaryKey(),
  no_kamar: integer("no_kamar").notNull(),
  tipe_kamar: text("tipe_kamar"),
  luas_m2: real("luas_m2"),
  lantai: integer("lantai"),
  fasilitas: text("fasilitas"),
  harga_bulan: integer("harga_bulan"),
  harga_3bulan: integer("harga_3bulan"),
  harga_6bulan: integer("harga_6bulan"),
  harga_9bulan: integer("harga_9bulan"),
  harga_tahun: integer("harga_tahun"),
  status: text("status"),
  catatan: text("catatan"),
});

/** Penghuni yang sedang tinggal. Trigger checkout MENGHAPUS barisnya. */
export const activeTenant = sqliteTable("active_tenant", {
  kamar_id: text("kamar_id").primaryKey(),
  email: text("email"),
  nama_lengkap: text("nama_lengkap").notNull(),
  nama_panggilan: text("nama_panggilan"),
  no_kamar: text("no_kamar"),
  pekerjaan: text("pekerjaan"),
  instansi: text("instansi"),
  no_hp: text("no_hp"),
  tanggal_lahir: text("tanggal_lahir"),
  asal_daerah: text("asal_daerah"),
  tanggal_masuk: text("tanggal_masuk"),
  created_at: text("created_at"),
  updated_at: text("updated_at"),
  id_penghuni: text("id_penghuni"),
});

/** Riwayat hunian permanen. Tidak pernah dihapus, jadi acuan FK Teman Rara. */
export const occupancyHistory = sqliteTable("occupancy_history", {
  id_penghuni: text("id_penghuni").primaryKey(),
  nama: text("nama").notNull(),
  no_kamar: text("no_kamar").notNull(),
  tanggal_mulai: text("tanggal_mulai").notNull(),
  tanggal_selesasi: text("tanggal_selesasi"),
  status: text("status"),
});

/** Tagihan sewa. `periode_akhir` dipakai sebagai tanggal jatuh tempo. */
export const invoiceSewa = sqliteTable("invoice_sewa", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  no_inv: text("no_inv").notNull(),
  id_penghuni: text("id_penghuni"),
  nama: text("nama").notNull(),
  email: text("email"),
  tanggal_pembayaran: text("tanggal_pembayaran"),
  periode_awal: text("periode_awal"),
  periode_akhir: text("periode_akhir"),
  no_kamar: text("no_kamar").notNull(),
  jumlah_bulan: integer("jumlah_bulan"),
  harga_sewa: integer("harga_sewa"),
  tambahan_listrik: integer("tambahan_listrik"),
  denda: integer("denda"),
  jumlah_denda: integer("jumlah_denda"),
  total_sewa: integer("total_sewa"),
  total_listrik: integer("total_listrik"),
  total_denda: integer("total_denda"),
  diskon: integer("diskon"),
  pajak: integer("pajak"),
  subtotal: integer("subtotal"),
  grand_total: integer("grand_total"),
  tipe_kamar: text("tipe_kamar"),
  checked: integer("checked").notNull().default(0),
  created_at: text("created_at"),
});

export const invoiceDp = sqliteTable("invoice_dp", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  no_inv: text("no_inv").notNull(),
  id_penghuni: text("id_penghuni"),
  nama: text("nama").notNull(),
  tanggal_pembayaran: text("tanggal_pembayaran"),
  no_kamar: text("no_kamar").notNull(),
  grand_total: integer("grand_total").notNull(),
  created_at: text("created_at"),
});

/** Catatan pelunasan. Satu invoice bisa dibayar beberapa kali (status Partial). */
export const payment = sqliteTable("payment", {
  id_payment: text("id_payment").primaryKey(),
  id_penghuni: text("id_penghuni").notNull(),
  invoice_dp_id: integer("invoice_dp_id"),
  invoice_sewa_id: integer("invoice_sewa_id"),
  periode_awal: text("periode_awal"),
  periode_akhir: text("periode_akhir"),
  amount: real("amount").notNull(),
  payment_date: text("payment_date"),
  payment_method: text("payment_method", { enum: ["Transfer", "Qris", "Cash"] }),
  status: text("status", {
    enum: ["Pending", "Paid", "Partial", "Overdue", "Cancelled", "Refund"],
  }).notNull(),
  notes: text("notes"),
  created_at: text("created_at"),
});

/** Booking. Trigger existing bereaksi pada status_booking 'Check-in'/'Check-out'. */
export const booking = sqliteTable("booking", {
  no_booking: text("no_booking").primaryKey(),
  id_penghuni: text("id_penghuni"),
  tanggal_booking: text("tanggal_booking"),
  nama_penyewa: text("nama_penyewa"),
  no_hp: text("no_hp"),
  kamar_no: integer("kamar_no"),
  tgl_masuk: text("tgl_masuk"),
  durasi_bulan: integer("durasi_bulan"),
  tgl_keluar_est: text("tgl_keluar_est"),
  harga_disepakati: integer("harga_disepakati"),
  status_booking: text("status_booking"),
  alasan_cancel: text("alasan_cancel"),
  sumber_leads: text("sumber_leads"),
  catatan: text("catatan"),
});

export const KATEGORI_COMPLAIN = [
  "Internet",
  "Listrik",
  "Air",
  "AC",
  "kebersihan",
  "Keamanan",
  "Fasilitas",
  "Pelayanan",
  "Lainnya",
] as const;

/** Pengaduan penghuni. Teman Rara menambah baris, pengelola mengubah status. */
export const tenantComplain = sqliteTable("tenant_complain", {
  id_complain: text("id_complain").primaryKey(),
  id_penghuni: text("id_penghuni").notNull(),
  category: text("category", { enum: KATEGORI_COMPLAIN }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull(),
  reported_at: text("reported_at"),
  resolved_at: text("resolved_at"),
});

/* ==========================================================================
 * TABEL TEMAN RARA (prefix tr_) — dikelola lewat db/migrations/003_teman_rara.sql
 * ========================================================================== */

export const trKamarWifi = sqliteTable("tr_kamar_wifi", {
  id_kamar: text("id_kamar")
    .primaryKey()
    .references(() => kamar.id_kamar),
  // Kolom di DB bernama `username` (dari migrasi yang sudah ter-deploy). UI
  // menampilkannya sebagai "Nama jaringan"/SSID; jangan rename kolomnya karena
  // sudah berisi data.
  username: text("username").notNull(),
  password: text("password").notNull(),
  catatan: text("catatan"),
  created_at: text("created_at").notNull().default(now),
  updated_at: text("updated_at").notNull().default(now),
  updated_by: text("updated_by"),
});

export const trAccount = sqliteTable("tr_account", {
  id_penghuni: text("id_penghuni")
    .primaryKey()
    .references(() => occupancyHistory.id_penghuni),
  clerk_user_id: text("clerk_user_id").notNull().unique(),
  claimed_at: text("claimed_at").notNull().default(now),
  revoked_at: text("revoked_at"),
  created_at: text("created_at").notNull().default(now),
  updated_at: text("updated_at").notNull().default(now),
});

export const trPaymentProof = sqliteTable(
  "tr_payment_proof",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    id_penghuni: text("id_penghuni")
      .notNull()
      .references(() => occupancyHistory.id_penghuni),
    invoice_sewa_id: integer("invoice_sewa_id").references(() => invoiceSewa.id),
    invoice_dp_id: integer("invoice_dp_id").references(() => invoiceDp.id),
    file_url: text("file_url").notNull(),
    file_type: text("file_type").notNull(),
    file_size: integer("file_size").notNull(),
    catatan: text("catatan"),
    verified_at: text("verified_at"),
    verified_by: text("verified_by"),
    created_at: text("created_at").notNull().default(now),
  },
  (t) => [index("idx_tr_proof_penghuni").on(t.id_penghuni, t.created_at)],
);

export const trComplainPhoto = sqliteTable(
  "tr_complain_photo",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    id_complain: text("id_complain")
      .notNull()
      .references(() => tenantComplain.id_complain),
    id_penghuni: text("id_penghuni")
      .notNull()
      .references(() => occupancyHistory.id_penghuni),
    file_url: text("file_url").notNull(),
    file_type: text("file_type").notNull(),
    file_size: integer("file_size").notNull(),
    created_at: text("created_at").notNull().default(now),
  },
  (t) => [index("idx_tr_photo_complain").on(t.id_complain)],
);

export const trComplainSync = sqliteTable("tr_complain_sync", {
  id_complain: text("id_complain")
    .primaryKey()
    .references(() => tenantComplain.id_complain),
  last_status: text("last_status").notNull(),
  last_notified_at: text("last_notified_at"),
  updated_at: text("updated_at").notNull().default(now),
});

export const trInformationBoard = sqliteTable(
  "tr_information_board",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    type: text("type", { enum: ["rule", "announcement"] }).notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    sort_order: integer("sort_order").notNull().default(0),
    published_at: text("published_at").notNull().default(now),
    created_at: text("created_at").notNull().default(now),
    updated_at: text("updated_at").notNull().default(now),
    created_by: text("created_by"),
    updated_by: text("updated_by"),
    deleted_at: text("deleted_at"),
    deleted_by: text("deleted_by"),
  },
  (t) => [index("idx_tr_board_type").on(t.type, t.published_at)],
);

export const trPushSubscription = sqliteTable(
  "tr_push_subscription",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    id_penghuni: text("id_penghuni").references(() => occupancyHistory.id_penghuni),
    created_at: text("created_at").notNull().default(now),
    updated_at: text("updated_at").notNull().default(now),
    deleted_at: text("deleted_at"),
  },
  (t) => [index("idx_tr_push_penghuni").on(t.id_penghuni)],
);

export const trNotificationPreference = sqliteTable("tr_notification_preference", {
  id_penghuni: text("id_penghuni")
    .primaryKey()
    .references(() => occupancyHistory.id_penghuni),
  push_enabled: integer("push_enabled", { mode: "boolean" }).notNull().default(true),
  email_enabled: integer("email_enabled", { mode: "boolean" }).notNull().default(true),
  in_app_enabled: integer("in_app_enabled", { mode: "boolean" }).notNull().default(true),
  created_at: text("created_at").notNull().default(now),
  updated_at: text("updated_at").notNull().default(now),
});

/** Pendaftaran penghuni baru dari form publik. Menempel ke booking. */
export const trPendaftaran = sqliteTable(
  "tr_pendaftaran",
  {
    no_booking: text("no_booking")
      .primaryKey()
      .references(() => booking.no_booking),
    email: text("email").notNull(),
    nama_lengkap: text("nama_lengkap").notNull(),
    nama_panggilan: text("nama_panggilan"),
    asal_daerah: text("asal_daerah"),
    no_hp: text("no_hp").notNull(),
    no_kamar: text("no_kamar").notNull(),
    rencana_masuk: text("rencana_masuk").notNull(),
    pekerjaan: text("pekerjaan", { enum: ["Karyawati", "Mahasiswi"] }).notNull(),
    program_studi: text("program_studi"),
    institusi: text("institusi").notNull(),
    darurat1_nama: text("darurat1_nama").notNull(),
    darurat1_nomor: text("darurat1_nomor").notNull(),
    darurat1_relasi: text("darurat1_relasi").notNull(),
    darurat2_nama: text("darurat2_nama"),
    darurat2_nomor: text("darurat2_nomor"),
    darurat2_relasi: text("darurat2_relasi"),
    jumlah_gadget: integer("jumlah_gadget").notNull(),
    barang_elektronik: text("barang_elektronik"),
    url_identitas: text("url_identitas").notNull(),
    url_bukti_dp: text("url_bukti_dp").notNull(),
    created_at: text("created_at").notNull().default(now),
    updated_at: text("updated_at").notNull().default(now),
  },
  (t) => [index("idx_tr_pendaftaran_kamar").on(t.no_kamar, t.created_at)],
);

export type KategoriComplain = (typeof KATEGORI_COMPLAIN)[number];
export type InvoiceSewaRow = typeof invoiceSewa.$inferSelect;
export type TenantComplainRow = typeof tenantComplain.$inferSelect;
