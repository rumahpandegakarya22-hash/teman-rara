// Reset klaim akun satu kamar (mis. akun dibajak atau penghuni ganti akun Clerk):
// putuskan tautan akun, matikan langganan push, lalu buat kode klaim baru.
//   npm run klaim:reset -- --kamar 12 --ya-ini-produksi
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { activeTenant, trAccount, trPushSubscription } from "../src/db/schema";
import { buatKodeKlaim } from "../src/lib/kode-klaim";
import { wajibIzinProduksi } from "./_guard.mjs";

async function main() {
  wajibIzinProduksi();
  const i = process.argv.indexOf("--kamar");
  const kamar = i >= 0 ? process.argv[i + 1] : null;
  if (!kamar) throw new Error("Pakai: --kamar <nomor>");

  const [p] = await db
    .select({ id: activeTenant.id_penghuni, nama: activeTenant.nama_lengkap })
    .from(activeTenant)
    .where(eq(activeTenant.no_kamar, kamar))
    .limit(1);
  if (!p?.id) throw new Error(`Kamar ${kamar} tidak punya penghuni aktif.`);

  await db.delete(trAccount).where(eq(trAccount.id_penghuni, p.id));
  await db
    .update(trPushSubscription)
    .set({ deleted_at: new Date().toISOString() })
    .where(eq(trPushSubscription.id_penghuni, p.id));
  const kode = await buatKodeKlaim(p.id);
  console.log(`Kamar ${kamar} (${p.nama}) direset.\nKode klaim baru: ${kode}  (30 hari, sekali pakai)`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
