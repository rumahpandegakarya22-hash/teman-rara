// Verifikasi Google Drive (OAuth refresh token): akses tiap folder, lalu
// round-trip upload -> download -> cocokkan byte -> hapus.
// Pakai dotenv supaya nilai multi-line/berkutip ke-parse benar.
//
// Jalankan: node scripts/uji-drive.mjs [path-env]   (default .env)
import dotenv from "dotenv";
import { google } from "googleapis";
import { Readable } from "node:stream";

dotenv.config({ path: process.argv[2] || ".env" });

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
  console.error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN belum lengkap.");
  process.exit(1);
}

const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: "v3", auth });

const FOLDER = {
  "Bukti Pembayaran Sewa": process.env.DRIVE_FOLDER_BUKTI_PEMBAYARAN_SEWA,
  "Bukti Pengaduan": process.env.DRIVE_FOLDER_PENGADUAN,
  "Dokumen Penghuni": process.env.DRIVE_DOKUMEN_PENGHUNI,
  "Bukti Pembayaran DP": process.env.DRIVE_FOLDER_BUKTI_PEMBAYARAN_DP,
};

console.log("== Cek token ==");
try {
  const t = await auth.getAccessToken();
  console.log("Refresh token valid, access token didapat:", t.token ? "ya" : "tidak");
} catch (e) {
  console.error("Token GAGAL:", e.message);
  process.exit(1);
}

console.log("\n== Cek akses folder ==");
let gagal = 0;
for (const [nama, id] of Object.entries(FOLDER)) {
  if (!id) {
    console.log(`${nama}: (env kosong)`);
    gagal++;
    continue;
  }
  try {
    const r = await drive.files.get({ fileId: id, fields: "id,name,mimeType", supportsAllDrives: true });
    const folder = r.data.mimeType === "application/vnd.google-apps.folder";
    console.log(`${nama}: OK -> "${r.data.name}"${folder ? "" : "  (BUKAN folder!)"}`);
    if (!folder) gagal++;
  } catch (e) {
    console.log(`${nama}: GAGAL -> ${e.message}`);
    gagal++;
  }
}

console.log("\n== Round-trip di folder Bukti Pembayaran Sewa ==");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
try {
  const buat = await drive.files.create({
    requestBody: { name: `uji-teman-rara-${Date.now()}.png`, parents: [FOLDER["Bukti Pembayaran Sewa"]] },
    media: { mimeType: "image/png", body: Readable.from(png) },
    fields: "id",
    supportsAllDrives: true,
  });
  console.log("1. Upload OK:", buat.data.id);

  const unduh = await drive.files.get(
    { fileId: buat.data.id, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" },
  );
  console.log("2. Download:", Buffer.from(unduh.data).equals(png) ? "byte COCOK" : "byte BEDA");

  await drive.files.delete({ fileId: buat.data.id, supportsAllDrives: true });
  console.log("3. Hapus OK — ROUND-TRIP BERHASIL");
} catch (e) {
  console.error("Round-trip GAGAL:", e.message);
  gagal++;
}

process.exit(gagal > 0 ? 1 : 0);
