"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq, like, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activeTenant, booking, kamar, trPendaftaran } from "@/db/schema";
import { normalisasi62 } from "@/lib/phone";
import { simpanGambar, validasiDokumen } from "@/lib/storage";
import { hariIniWIB, tambahHari } from "@/lib/waktu";

export type KamarOpsi = { no_kamar: number; tipe_kamar: string | null };

// Booking yang "menahan" kamar dari calon lain: penghuni aktif (Check-in),
// sudah dikonfirmasi, atau pendaftaran yang masih diproses (Pending — termasuk
// pendaftaran Teman Rara sendiri). Dibandingkan case-insensitive.
const STATUS_MENAHAN = new Set(["check-in", "konfirmasi", "pending"]);
// Jeda aman setelah tanggal keluar penghuni lama sebelum penghuni baru masuk.
const BUFFER_HARI = 7;

/**
 * Kamar yang tersedia untuk rencana masuk `tanggal`.
 *
 * Aturan:
 *  - Kamar tanpa active_tenant DAN tanpa booking penahan (Check-in/Konfirmasi/
 *    Pending) → tersedia kapan pun.
 *  - Kamar berpenghuni → tersedia hanya bila booking non-checkout terakhir
 *    penghuninya punya tgl_keluar_est yang (a) BELUM lewat (>= hari ini; kalau
 *    sudah lewat berarti estimasi basi karena penghuni perpanjang, jadi kamar
 *    dianggap masih terisi) DAN (b) tgl_keluar_est + BUFFER_HARI <= tanggal.
 *
 * Menahan pakai active_tenant sebagai sumber kebenaran "sedang dihuni"; trigger
 * checkout di DB menghapus barisnya begitu penghuni keluar.
 */
async function getKamarTersedia(tanggal: string, tipeKamar?: string): Promise<KamarOpsi[]> {
  const hariIni = hariIniWIB();

  const [semuaKamar, penghuniAktif, semuaBooking] = await Promise.all([
    db
      .select({ id_kamar: kamar.id_kamar, no_kamar: kamar.no_kamar, tipe_kamar: kamar.tipe_kamar })
      .from(kamar)
      .where(tipeKamar ? eq(kamar.tipe_kamar, tipeKamar) : undefined)
      .orderBy(asc(kamar.no_kamar)),
    db.select({ kamar_id: activeTenant.kamar_id, id_penghuni: activeTenant.id_penghuni }).from(activeTenant),
    db
      .select({
        id_penghuni: booking.id_penghuni,
        kamar_no: booking.kamar_no,
        status_booking: booking.status_booking,
        tgl_keluar_est: booking.tgl_keluar_est,
        tanggal_booking: booking.tanggal_booking,
      })
      .from(booking),
  ]);

  const penghuniPerKamar = new Map(
    penghuniAktif.filter((p) => p.id_penghuni).map((p) => [p.kamar_id, p.id_penghuni as string]),
  );

  // Kamar yang ditahan booking Check-in/Konfirmasi/Pending (dipesan orang lain).
  const kamarDitahan = new Set(
    semuaBooking
      .filter((b) => STATUS_MENAHAN.has(String(b.status_booking ?? "").toLowerCase().trim()))
      .map((b) => String(b.kamar_no)),
  );

  // Booking non-checkout terbaru per penghuni → sumber tgl_keluar_est.
  const bookingTerbaru = new Map<string, { tgl_keluar_est: string | null; tanggal_booking: string | null }>();
  for (const b of semuaBooking) {
    if (!b.id_penghuni) continue;
    if (String(b.status_booking ?? "").toLowerCase().trim() === "check-out") continue;
    const ada = bookingTerbaru.get(b.id_penghuni);
    if (!ada || (b.tanggal_booking ?? "") > (ada.tanggal_booking ?? "")) {
      bookingTerbaru.set(b.id_penghuni, b);
    }
  }

  return semuaKamar
    .filter((k) => {
      const idPenghuni = penghuniPerKamar.get(k.id_kamar);
      if (!idPenghuni) {
        // Kosong sekarang: tersedia asal tidak dipesan booking penahan.
        return !kamarDitahan.has(String(k.no_kamar));
      }
      // Terisi: hanya tersedia bila penghuninya punya rencana keluar yang belum
      // basi, dan tanggal masuk pendaftar >= tgl keluar + buffer.
      const est = bookingTerbaru.get(idPenghuni)?.tgl_keluar_est;
      if (!est || est < hariIni) return false;
      return tambahHari(est, BUFFER_HARI) <= tanggal;
    })
    .map(({ no_kamar, tipe_kamar }) => ({ no_kamar, tipe_kamar }));
}

/** Daftar tipe kamar yang benar-benar ada di database, untuk dropdown langkah 1. */
export async function getTipeKamarTersedia(): Promise<string[]> {
  const rows = await db.selectDistinct({ tipe_kamar: kamar.tipe_kamar }).from(kamar);
  return rows.map((r) => r.tipe_kamar).filter((t): t is string => !!t).sort();
}

export type KetersediaanState = { kamar: KamarOpsi[]; error?: string };

const tanggalSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid");

/** Dipanggil langsung dari form (bukan submit) saat pendaftar memilih tanggal + tipe kamar. */
export async function cekKetersediaan(tanggal: string, tipeKamar: string): Promise<KetersediaanState> {
  const parsedTanggal = tanggalSchema.safeParse(tanggal);
  if (!parsedTanggal.success || !tipeKamar.trim()) {
    return { kamar: [], error: "Isi tanggal dan tipe kamar dulu." };
  }
  const hasil = await getKamarTersedia(parsedTanggal.data, tipeKamar);
  return { kamar: hasil };
}

const hp = z
  .string()
  .trim()
  .refine((v) => /^62[0-9]{8,13}$/.test(normalisasi62(v)), "Nomor HP tidak valid");

const schema = z
  .object({
    email: z.email("Alamat email tidak valid").max(150),
    nama_lengkap: z.string().trim().min(2, "Nama lengkap wajib diisi").max(100),
    nama_panggilan: z.string().trim().min(1, "Nama panggilan wajib diisi").max(50),
    asal_daerah: z.string().trim().min(2, "Asal daerah wajib diisi").max(100),
    no_hp: hp,
    no_kamar: z.string().trim().min(1, "Nomor kamar wajib dipilih").max(10),
    rencana_masuk: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal rencana masuk tidak valid"),
    pekerjaan: z.enum(["Karyawati", "Mahasiswi"]),
    program_studi: z.string().trim().max(100).optional().or(z.literal("")),
    institusi: z.string().trim().min(2, "Institusi wajib diisi").max(150),
    darurat1_nama: z.string().trim().min(2, "Nama kontak darurat 1 wajib diisi").max(100),
    darurat1_nomor: hp,
    darurat1_relasi: z.string().trim().min(2, "Relasi kontak darurat 1 wajib diisi").max(50),
    darurat2_nama: z.string().trim().max(100).optional().or(z.literal("")),
    darurat2_nomor: z.string().trim().optional().or(z.literal("")),
    darurat2_relasi: z.string().trim().max(50).optional().or(z.literal("")),
    jumlah_gadget: z.coerce.number().int().min(1).max(5),
    barang_elektronik: z.string().trim().min(1, "Barang elektronik wajib diisi (tulis '-' bila tidak ada)").max(500),
    nopol: z.string().trim().min(1, "Nopol wajib diisi (tulis '-' bila tidak membawa kendaraan)").max(20),
  })
  .refine((d) => d.pekerjaan !== "Mahasiswi" || (d.program_studi ?? "").trim().length > 1, {
    message: "Program studi wajib diisi untuk mahasiswi",
    path: ["program_studi"],
  });

export type PendaftaranState = { error?: string };

// Batas kiriman per IP. Form ini publik, jadi perlu rem sederhana.
const jejak = new Map<string, { jumlah: number; sampai: number }>();
const MAKS = 3;
const JENDELA_MS = 60 * 60_000;

function lewatBatas(ip: string) {
  const kini = Date.now();
  const c = jejak.get(ip);
  if (!c || c.sampai < kini) {
    jejak.set(ip, { jumlah: 1, sampai: kini + JENDELA_MS });
    return false;
  }
  c.jumlah += 1;
  return c.jumlah > MAKS;
}

/** Format BK-YYMM-XXX; YYMM dari tanggal booking, XXX urut per bulan. Dipanggil di dalam transaksi. */
async function buatNoBooking(tx: Pick<typeof db, "select">, tanggalBooking: string) {
  const yymm = tanggalBooking.slice(2, 4) + tanggalBooking.slice(5, 7);
  const awalan = `BK-${yymm}-`;
  const [{ maks }] = await tx
    .select({ maks: sql<number>`coalesce(max(cast(substr(${booking.no_booking}, -3) as integer)), 0)` })
    .from(booking)
    .where(like(booking.no_booking, `${awalan}%`));
  return `${awalan}${String(maks + 1).padStart(3, "0")}`;
}

export async function kirimPendaftaran(
  _prev: PendaftaranState,
  formData: FormData,
): Promise<PendaftaranState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "lokal";
  if (lewatBatas(ip)) {
    return { error: "Terlalu banyak pengiriman. Coba lagi satu jam lagi atau hubungi pengelola." };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ada isian yang belum benar." };
  }
  const d = parsed.data;

  const identitas = formData.get("scan_identitas");
  const buktiDp = formData.get("scan_bukti_dp");
  if (!(identitas instanceof File) || !(buktiDp instanceof File)) {
    return { error: "Scan identitas dan bukti pembayaran DP wajib diunggah." };
  }
  for (const f of [identitas, buktiDp]) {
    const cek = validasiDokumen(f);
    if (!cek.ok) return { error: cek.pesan };
  }

  // Kamar harus tersedia PADA tanggal rencana masuk — bukan cuma kosong saat
  // ini. Cek ulang di server (bukan cuma percaya pilihan client) memakai
  // logika yang sama dengan cekKetersediaan.
  const tersedia = await getKamarTersedia(d.rencana_masuk);
  const kamarDipilih = tersedia.find((k) => k.no_kamar === Number(d.no_kamar));
  if (!kamarDipilih) {
    return { error: "Kamar itu tidak tersedia pada tanggal itu. Pilih kamar/tanggal lain atau hubungi pengelola." };
  }

  const tanggalBooking = hariIniWIB();
  let noBooking = "";

  try {
    // Unggah dulu: kalau gagal, tidak ada booking menggantung tanpa dokumen.
    const [urlIdentitas, urlBuktiDp] = await Promise.all([
      simpanGambar(identitas, "penghuni"),
      simpanGambar(buktiDp, "DP"),
    ]);

    await db.transaction(async (tx) => {
      noBooking = await buatNoBooking(tx, tanggalBooking);
      // Status 'Pending' — BUKAN 'Check-in', supaya trigger existing tidak
      // membuat occupancy_history/active_tenant sebelum staf memverifikasi.
      await tx.insert(booking).values({
        no_booking: noBooking,
        tanggal_booking: tanggalBooking,
        nama_penyewa: d.nama_lengkap,
        no_hp: normalisasi62(d.no_hp),
        kamar_no: Number(d.no_kamar),
        tgl_masuk: d.rencana_masuk,
        status_booking: "Pending",
        sumber_leads: "Teman Rara",
        catatan: "Pendaftaran mandiri lewat aplikasi Teman Rara.",
      });

      await tx.insert(trPendaftaran).values({
        no_booking: noBooking,
        email: d.email,
        nama_lengkap: d.nama_lengkap,
        nama_panggilan: d.nama_panggilan || null,
        asal_daerah: d.asal_daerah || null,
        no_hp: normalisasi62(d.no_hp),
        no_kamar: d.no_kamar,
        rencana_masuk: d.rencana_masuk,
        pekerjaan: d.pekerjaan,
        program_studi: d.pekerjaan === "Mahasiswi" ? d.program_studi || null : "-",
        institusi: d.institusi,
        darurat1_nama: d.darurat1_nama,
        darurat1_nomor: normalisasi62(d.darurat1_nomor),
        darurat1_relasi: d.darurat1_relasi,
        darurat2_nama: d.darurat2_nama || null,
        darurat2_nomor: d.darurat2_nomor ? normalisasi62(d.darurat2_nomor) : null,
        darurat2_relasi: d.darurat2_relasi || null,
        jumlah_gadget: d.jumlah_gadget,
        barang_elektronik: d.barang_elektronik || null,
        nopol: d.nopol.toUpperCase(),
        url_identitas: urlIdentitas,
        url_bukti_dp: urlBuktiDp,
      });
    });
  } catch (e) {
    // Dulu error asli ditelan diam-diam sehingga penyebab (mis. token Google
    // Drive kedaluwarsa) tidak pernah kelihatan di log. Sekarang dicatat, dan
    // kegagalan unggah dokumen dibedakan dari kegagalan simpan data.
    console.error("[pendaftaran] gagal:", e);
    const pesan = e instanceof Error ? e.message : "";
    if (/drive|oauth|token|invalid_grant|folder/i.test(pesan)) {
      return { error: "Unggah dokumen gagal (kendala penyimpanan). Coba lagi; kalau tetap gagal, hubungi pengelola." };
    }
    return { error: "Gagal menyimpan pendaftaran. Coba lagi sebentar." };
  }

  redirect(`/pendaftaran/terkirim?no=${encodeURIComponent(noBooking)}`);
}
