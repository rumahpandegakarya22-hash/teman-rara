"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activeTenant, booking, kamar, trPendaftaran } from "@/db/schema";
import { normalisasi62 } from "@/lib/phone";
import { simpanGambar, validasiDokumen } from "@/lib/storage";

const hp = z
  .string()
  .trim()
  .refine((v) => /^62[0-9]{8,13}$/.test(normalisasi62(v)), "Nomor HP tidak valid");

const schema = z
  .object({
    email: z.email("Alamat email tidak valid").max(150),
    nama_lengkap: z.string().trim().min(2, "Nama lengkap wajib diisi").max(100),
    nama_panggilan: z.string().trim().max(50).optional().or(z.literal("")),
    asal_daerah: z.string().trim().max(100).optional().or(z.literal("")),
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
    barang_elektronik: z.string().trim().max(500).optional().or(z.literal("")),
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

/** no_booking dari Teman Rara diberi awalan TR supaya mudah dibedakan staf. */
function buatNoBooking() {
  const tgl = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `TR-${tgl}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
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

  // Kamar harus ada dan belum ditempati.
  const [kamarDipilih] = await db
    .select({ no_kamar: kamar.no_kamar })
    .from(kamar)
    // Kamar terisi = ada baris active_tenant. Trigger checkout menghapusnya.
    .leftJoin(activeTenant, eq(activeTenant.kamar_id, kamar.id_kamar))
    .where(and(eq(kamar.no_kamar, Number(d.no_kamar)), isNull(activeTenant.kamar_id)))
    .limit(1);
  if (!kamarDipilih) {
    return { error: "Kamar itu tidak tersedia. Pilih kamar lain atau hubungi pengelola." };
  }

  const noBooking = buatNoBooking();

  try {
    // Unggah dulu: kalau gagal, tidak ada booking menggantung tanpa dokumen.
    const [urlIdentitas, urlBuktiDp] = await Promise.all([
      simpanGambar(identitas, "penghuni"),
      simpanGambar(buktiDp, "DP"),
    ]);

    await db.transaction(async (tx) => {
      // Status 'Pending' — BUKAN 'Check-in', supaya trigger existing tidak
      // membuat occupancy_history/active_tenant sebelum staf memverifikasi.
      await tx.insert(booking).values({
        no_booking: noBooking,
        tanggal_booking: new Date().toISOString().slice(0, 10),
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
        url_identitas: urlIdentitas,
        url_bukti_dp: urlBuktiDp,
      });
    });
  } catch {
    return { error: "Gagal menyimpan pendaftaran. Coba lagi sebentar." };
  }

  redirect(`/pendaftaran/terkirim?no=${encodeURIComponent(noBooking)}`);
}
