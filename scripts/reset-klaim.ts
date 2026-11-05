// Putuskan tautan akun satu kamar (penghuni ganti akun Clerk, atau akun yang
// sudah di-revoke): hapus tr_account dan matikan langganan push. Setelah itu
// penghuni bisa klaim ulang lewat /onboarding.
//   npm run klaim:reset -- --kamar 12 --ya-ini-produksi
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { activeTenant, trAccount, trPushSubscription } from "../src/db/schema";
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
  console.log(`Kamar ${kamar} (${p.nama}) direset. Penghuni bisa klaim ulang lewat /onboarding.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
