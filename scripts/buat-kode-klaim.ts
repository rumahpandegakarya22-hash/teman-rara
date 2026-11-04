// Buat kode klaim untuk penghuni aktif yang belum punya akun Teman Rara.
//   Semua yang belum klaim:  npm run klaim:buat -- --ya-ini-produksi
//   Satu kamar saja:         npm run klaim:buat -- --kamar 12 --ya-ini-produksi
// Kode ditampilkan SEKALI di layar ini; di database hanya tersimpan hash-nya.
import { eq, isNull } from "drizzle-orm";
import { db } from "../src/db";
import { activeTenant, trAccount } from "../src/db/schema";
import { buatKodeKlaim } from "../src/lib/kode-klaim";
import { wajibIzinProduksi } from "./_guard.mjs";

async function main() {
  wajibIzinProduksi();
  const i = process.argv.indexOf("--kamar");
  const kamar = i >= 0 ? process.argv[i + 1] : null;
  if (i >= 0 && !kamar) throw new Error("--kamar butuh nomor kamar");

  const baris = await db
    .select({ id: activeTenant.id_penghuni, nama: activeTenant.nama_lengkap, kamar: activeTenant.no_kamar })
    .from(activeTenant)
    .leftJoin(trAccount, eq(trAccount.id_penghuni, activeTenant.id_penghuni))
    .where(kamar ? eq(activeTenant.no_kamar, kamar) : isNull(trAccount.id_penghuni));

  const daftar = baris.filter((b) => b.id).sort((a, b) => Number(a.kamar) - Number(b.kamar));
  if (daftar.length === 0) {
    console.log("Tidak ada penghuni yang perlu kode.");
    return;
  }
  console.log("KAMAR\tNAMA\tKODE");
  for (const b of daftar) console.log(`${b.kamar}\t${b.nama}\t${await buatKodeKlaim(b.id as string)}`);
  console.log(`\n${daftar.length} kode dibuat, berlaku 30 hari, sekali pakai.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
