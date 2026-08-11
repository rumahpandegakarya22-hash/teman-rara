import "server-only";
import { driveSiap, getAccessToken, withRetry } from "./google";

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
  const isi = new Uint8Array(await file.arrayBuffer());

  // Upload multipart/related manual: bagian pertama metadata JSON, bagian kedua
  // byte berkas. Disusun sebagai satu Uint8Array supaya bisa dikirim `fetch`.
  const boundary = `tr${crypto.randomUUID().replace(/-/g, "")}`;
  const enc = new TextEncoder();
  const pembuka = enc.encode(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify({ name: nama, parents: [folderId] })}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${file.type}\r\n\r\n`,
  );
  const penutup = enc.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(pembuka.length + isi.length + penutup.length);
  body.set(pembuka, 0);
  body.set(isi, pembuka.length);
  body.set(penutup, pembuka.length + isi.length);

  return withRetry(async () => {
    const token = await getAccessToken();
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    if (!res.ok) {
      const teks = await res.text().catch(() => "");
      throw Object.assign(new Error(`Drive upload gagal (${res.status}): ${teks.slice(0, 200)}`), {
        status: res.status,
      });
    }
    const data = (await res.json()) as { id?: string };
    if (!data.id) throw new Error("Drive tidak mengembalikan fileId");
    return `/api/berkas/${data.id}`;
  });
}

/** Ambil isi berkas dari Drive sebagai buffer + mime. Dipakai route penyaji. */
export async function ambilGambar(fileId: string): Promise<{ buffer: Buffer; mime: string }> {
  const id = encodeURIComponent(fileId);
  return withRetry(async () => {
    const token = await getAccessToken();
    const auth = { Authorization: `Bearer ${token}` };

    const [metaRes, mediaRes] = await Promise.all([
      fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=mimeType&supportsAllDrives=true`, {
        headers: auth,
      }),
      fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, {
        headers: auth,
      }),
    ]);
    if (!metaRes.ok) throw Object.assign(new Error(`Drive meta gagal (${metaRes.status})`), { status: metaRes.status });
    if (!mediaRes.ok) throw Object.assign(new Error(`Drive media gagal (${mediaRes.status})`), { status: mediaRes.status });

    const meta = (await metaRes.json()) as { mimeType?: string };
    const buffer = Buffer.from(await mediaRes.arrayBuffer());
    return { buffer, mime: meta.mimeType || "application/octet-stream" };
  });
}
