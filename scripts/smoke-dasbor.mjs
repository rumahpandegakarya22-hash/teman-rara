// Uji lapisan data dasbor tanpa sesi Clerk: buat penghuni + tagihan contoh,
// lalu periksa query yang dipakai halaman /kamar. Jalankan: node --env-file=.env scripts/smoke-dasbor.mjs
import { createClient } from "@libsql/client";

const db = createClient({ url: process.env.DATABASE_URL });
const uuid = () => crypto.randomUUID();
const CLERK_ID = "user_smoke_test";

const q = async (sql, args = []) => (await db.execute({ sql, args })).rows;

// Bersihkan sisa uji sebelumnya (urut mundur mengikuti foreign key).
const [lama] = await q("SELECT id FROM tenant WHERE clerk_user_id = ?", [CLERK_ID]);
if (lama) {
  await q("DELETE FROM payment_proof WHERE tenant_id = ?", [lama.id]);
  await q("DELETE FROM payment WHERE tenant_id = ?", [lama.id]);
  await q("DELETE FROM tenant WHERE id = ?", [lama.id]);
}

const [kamar] = await q("SELECT id, room_number, price FROM room ORDER BY room_number LIMIT 1");
const tenantId = uuid();
const paymentId = uuid();

await q(
  "INSERT INTO tenant (id, clerk_user_id, room_id, full_name, phone, email) VALUES (?,?,?,?,?,?)",
  [tenantId, CLERK_ID, kamar.id, "Penghuni Uji", "081234567890", "uji@contoh.id"],
);
await q(
  "INSERT INTO payment (id, tenant_id, room_id, period, amount, due_date, status) VALUES (?,?,?,?,?,?,?)",
  [paymentId, tenantId, kamar.id, "2026-07", kamar.price, "2026-07-05T00:00:00Z", "overdue"],
);
await q(
  "INSERT INTO payment_proof (id, payment_id, tenant_id, file_url, file_type, file_size) VALUES (?,?,?,?,?,?)",
  [uuid(), paymentId, tenantId, `/api/berkas/bukti-${uuid()}.jpg`, "image/jpeg", 123456],
);

const hasil = {
  "penghuni + kamar (join)": (
    await q(
      `SELECT t.full_name, r.room_number, r.price, r.wifi_username FROM tenant t
       JOIN room r ON r.id = t.room_id WHERE t.clerk_user_id = ?`,
      [CLERK_ID],
    )
  )[0],
  "tagihan terbaru": (
    await q("SELECT period, amount, status FROM payment WHERE tenant_id = ? ORDER BY due_date DESC LIMIT 1", [
      tenantId,
    ])
  )[0],
  "jumlah bukti bayar": (
    await q("SELECT COUNT(*) AS n FROM payment_proof WHERE tenant_id = ?", [tenantId])
  )[0].n,
  "kamar tersedia (dari 30)": (
    await q(
      `SELECT COUNT(*) AS n FROM room r
       LEFT JOIN tenant t ON t.room_id = r.id AND t.deleted_at IS NULL AND t.checked_out_at IS NULL
       WHERE r.deleted_at IS NULL AND t.id IS NULL`,
    )
  )[0].n,
};

console.log(JSON.stringify(hasil, null, 2));

// Kamar yang sudah diklaim tidak boleh muncul lagi di daftar onboarding.
const bocor = await q(
  `SELECT r.room_number FROM room r
   LEFT JOIN tenant t ON t.room_id = r.id AND t.deleted_at IS NULL AND t.checked_out_at IS NULL
   WHERE r.id = ? AND t.id IS NULL`,
  [kamar.id],
);
console.log(bocor.length === 0 ? "OK: kamar terisi tidak muncul di daftar" : "GAGAL: kamar terisi masih tersedia");
