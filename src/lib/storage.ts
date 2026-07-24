import "server-only";
import { Readable } from "node:stream";
import { driveClient, driveSiap, withRetry } from "./google";

export const TIPE_DIIZINKAN = ["image/jpeg", "image/png", "application/pdf"] as const;
export const UKURAN_MAKS = 2 * 1024 * 1024; // 2 MB

export type HasilValidasi = { ok: true } | { ok: false; pesan: string };

/** Validasi server-side. Jangan pernah percaya atribut `accept` di input file. */
export function validasiGambar(file: File): HasilValidasi {
  if (file.size === 0) return { ok: false, pesan: "Berkas kosong." };
  if (file.size > UKURAN_MAKS) return { ok: false, pesan: "Ukuran file maksimal 2 MB." };
  if (!TIPE_DIIZINKAN.includes(file.type as (typeof TIPE_DIIZINKAN)[number])) {
    return { ok: false, pesan: "Format harus JPG, PNG, atau PDF." };
  }
  return { ok: true };
}

/** Dokumen (KTP, bukti DP) boleh PDF selain gambar. */
export function validasiDokumen(file: File): HasilValidasi {
  if (file.size === 0) return { ok: false, pesan: "Berkas kosong." };
  if (file.size > UKURAN_MAKS) return { ok: false, pesan: "Ukuran berkas maksimal 5 MB." };
  const boleh = [...TIPE_DIIZINKAN, "application/pdf"] as readonly string[];
  if (!boleh.includes(file.type)) {
    return { ok: false, pesan: "Format harus JPG, PNG, WebP, atau PDF." };
  }
  return { ok: true };
}

// Jenis berkas → folder Drive.
const FOLDER = {
  bukti: process.env.DRIVE_FOLDER_BUKTI_PEMBAYARAN_SEWA,
  aduan: process.env.DRIVE_FOLDER_PENGADUAN,
  penghuni: process.env.DRIVE_DOKUMEN_PENGHUNI,
  DP: process.env.DRIVE_FOLDER_BUKTI_PEMBAYARAN_DP,
} as const;

export type JenisBerkas = keyof typeof FOLDER;

/**
 * Unggah gambar ke Google Drive lewat service account, kembalikan referensi
 * `/api/berkas/<fileId>`. Berkas TIDAK dibuat publik: penghuni membukanya lewat
 * route terproteksi yang men-stream ulang setelah cek kepemilikan.
 */
export async function simpanGambar(file: File, jenis: JenisBerkas): Promise<string> {
  if (!driveSiap()) throw new Error("Google Drive belum dikonfigurasi (OAuth)");
  const folderId = FOLDER[jenis];
  if (!folderId) throw new Error(`Folder Drive untuk '${jenis}' belum diset di env`);

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const nama = `${jenis}-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const res = await withRetry(() =>
    driveClient().files.create({
      requestBody: { name: nama, parents: [folderId] },
      media: { mimeType: file.type, body: Readable.from(buffer) },
      fields: "id",
      supportsAllDrives: true, // folder berada di Shared Drive
    }),
  );

  const fileId = res.data.id;
  if (!fileId) throw new Error("Drive tidak mengembalikan fileId");
  return `/api/berkas/${fileId}`;
}

/** Ambil isi berkas dari Drive sebagai buffer + mime. Dipakai route penyaji. */
export async function ambilGambar(fileId: string): Promise<{ buffer: Buffer; mime: string }> {
  const meta = await withRetry(() =>
    driveClient().files.get({ fileId, fields: "mimeType", supportsAllDrives: true }),
  );
  const res = await withRetry(() =>
    driveClient().files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" }),
  );
  return {
    buffer: Buffer.from(res.data as ArrayBuffer),
    mime: meta.data.mimeType || "application/octet-stream",
  };
}
