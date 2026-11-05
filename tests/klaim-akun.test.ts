import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { buatDbUji } from "./helpers/db-uji";
import { activeTenant, kamar, occupancyHistory, trAccount } from "@/db/schema";

let uji: Awaited<ReturnType<typeof buatDbUji>>;
vi.mock("@/db", async () => {
  uji = await buatDbUji();
  return { db: uji.db };
});

let clerkId = "clerk-1";
let emailClerk = "";
let statusEmail = "verified";
vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: async () => {} },
  currentUser: async () => ({
    id: clerkId,
    emailAddresses: [{ emailAddress: emailClerk, verification: { status: statusEmail } }],
  }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "cf-connecting-ip": "9.9.9.9" }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const UMUM = /tidak cocok/;

async function penghuni(id: string, noKamar: number, hp: string, email: string, panggilan?: string) {
  await uji.db.insert(kamar).values({ id_kamar: `K${noKamar}`, no_kamar: noKamar });
  await uji.db.insert(occupancyHistory).values({ id_penghuni: id, nama: id, no_kamar: String(noKamar), tanggal_mulai: "2026-01-01" });
  await uji.db.insert(activeTenant).values({
    kamar_id: `K${noKamar}`,
    id_penghuni: id,
    nama_lengkap: `Budi ${id}`,
    nama_panggilan: panggilan,
    no_kamar: String(noKamar),
    no_hp: hp,
    email,
  });
}

const form = (no_kamar: string, no_hp: string, nama: string) => {
  const f = new FormData();
  f.set("no_kamar", no_kamar);
  f.set("no_hp", no_hp);
  f.set("nama", nama);
  return f;
};

async function klaim(f: FormData) {
  const { klaimAkun } = await import("@/app/onboarding/actions");
  try {
    return await klaimAkun({}, f);
  } catch (e) {
    const m = (e as Error).message;
    if (m.startsWith("REDIRECT:")) return { redirect: m.slice(9) };
    throw e;
  }
}
const akun = (id: string) => uji.db.select().from(trAccount).where(eq(trAccount.id_penghuni, id));
const galat = (r: unknown) => (r as { error?: string }).error;

describe("klaimAkun lewat email terverifikasi", () => {
  beforeAll(async () => {
    await import("@/db");
  });
  beforeEach(() => {
    statusEmail = "verified";
  });

  it("email + nama + HP cocok: akun tertaut (email beda huruf, HP beda format)", async () => {
    clerkId = "c-ok";
    emailClerk = "BUDI@Contoh.com";
    await penghuni("P1", 1, "081111111111", "budi@contoh.com");
    expect(await klaim(form("1", "+62 811-1111-1111", "budi  p1"))).toEqual({ redirect: "/kamar" });
    expect((await akun("P1"))[0].clerk_user_id).toBe("c-ok");
  });

  it("gmail: titik dan +alias diabaikan; nama panggilan diterima", async () => {
    clerkId = "c-gmail";
    emailClerk = "bu.di+kost@gmail.com";
    await penghuni("P2", 2, "082222222222", "budi@gmail.com", "Bud");
    expect(await klaim(form("2", "082222222222", "Bud"))).toEqual({ redirect: "/kamar" });
  });

  it("email Clerk tidak sama dengan data penghuni: ditolak, pesan seragam", async () => {
    clerkId = "c-beda";
    emailClerk = "orang.lain@contoh.com";
    await penghuni("P3", 3, "083333333333", "budi3@contoh.com");
    expect(galat(await klaim(form("3", "083333333333", "Budi P3")))).toMatch(UMUM);
    expect(await akun("P3")).toHaveLength(0);
  });

  it("email cocok tapi BELUM diverifikasi: ditolak", async () => {
    clerkId = "c-unverified";
    emailClerk = "budi4@contoh.com";
    statusEmail = "unverified";
    await penghuni("P4", 4, "084444444444", "budi4@contoh.com");
    expect(galat(await klaim(form("4", "084444444444", "Budi P4")))).toMatch(UMUM);
    expect(await akun("P4")).toHaveLength(0);
  });

  it("HP atau nama salah: ditolak walau email cocok", async () => {
    clerkId = "c-salah";
    emailClerk = "budi5@contoh.com";
    await penghuni("P5", 5, "085555555555", "budi5@contoh.com");
    expect(galat(await klaim(form("5", "089999999999", "Budi P5")))).toMatch(UMUM);
    expect(galat(await klaim(form("5", "085555555555", "Siapa Saja")))).toMatch(UMUM);
    expect(await akun("P5")).toHaveLength(0);
  });

  it("email penghuni kosong: tidak ada yang bisa klaim", async () => {
    clerkId = "c-kosong";
    emailClerk = "";
    await penghuni("P6", 6, "086666666666", "");
    expect(galat(await klaim(form("6", "086666666666", "Budi P6")))).toMatch(UMUM);
  });

  it("kamar sudah tertaut ke akun lain: ditolak; akun yang sama boleh klaim ulang", async () => {
    clerkId = "c-pertama";
    emailClerk = "budi7@contoh.com";
    await penghuni("P7", 7, "087777777777", "budi7@contoh.com");
    expect(await klaim(form("7", "087777777777", "Budi P7"))).toEqual({ redirect: "/kamar" });
    expect(await klaim(form("7", "087777777777", "Budi P7"))).toEqual({ redirect: "/kamar" });
    clerkId = "c-kedua";
    expect(galat(await klaim(form("7", "087777777777", "Budi P7")))).toMatch(/sudah tertaut/);
  });

  it("check-in ulang (id_penghuni baru) dengan akun Clerk lama: tautan dipindah", async () => {
    clerkId = "c-balik";
    emailClerk = "budi8@contoh.com";
    await penghuni("P8", 8, "088888888888", "budi8@contoh.com");
    await uji.db.insert(occupancyHistory).values({ id_penghuni: "P8-LAMA", nama: "P8", no_kamar: "8", tanggal_mulai: "2025-01-01" });
    await uji.db.insert(trAccount).values({ id_penghuni: "P8-LAMA", clerk_user_id: "c-balik", revoked_at: "2026-01-01" });
    expect(await klaim(form("8", "088888888888", "Budi P8"))).toEqual({ redirect: "/kamar" });
    expect((await akun("P8"))[0].clerk_user_id).toBe("c-balik");
    expect(await akun("P8-LAMA")).toHaveLength(0);
  });

  it("akun Clerk masih tertaut ke penghuni aktif lain: ditolak", async () => {
    clerkId = "c-ganda";
    emailClerk = "budi9@contoh.com";
    await penghuni("P9", 9, "089999999990", "budi9@contoh.com");
    await penghuni("P10", 10, "081010101010", "lain10@contoh.com");
    await uji.db.insert(trAccount).values({ id_penghuni: "P10", clerk_user_id: "c-ganda" });
    expect(galat(await klaim(form("9", "089999999990", "Budi P9")))).toMatch(/kamar lain/);
    expect(await akun("P9")).toHaveLength(0);
  });
});

describe("trigger akses akun saat checkout (tabel Ops)", () => {
  const q = (sql: string, args: (string | number)[] = []) => uji.client.execute({ sql, args });
  const akunRaw = async (id: string) =>
    (await q("SELECT revoked_at FROM tr_account WHERE id_penghuni = ?", [id])).rows[0];
  const pushRaw = async (id: string) =>
    (await q("SELECT deleted_at FROM tr_push_subscription WHERE id_penghuni = ?", [id])).rows[0];

  async function checkIn(noBooking: string, idPenghuni: string, noKamar: number) {
    await q("INSERT INTO booking (no_booking, id_penghuni, nama_penyewa, no_hp, kamar_no, tgl_masuk, status_booking) VALUES (?,?,?,?,?,?, 'Check-in')", [
      noBooking, idPenghuni, `Nama ${idPenghuni}`, "081200000000", noKamar, "2026-02-01",
    ]);
  }

  beforeAll(async () => {
    await import("@/db");
    await q("INSERT INTO kamar (id_kamar, no_kamar) VALUES ('KTD-81', 81)");
    await checkIn("B-81", "X1", 81);
    await q("INSERT INTO tr_account (id_penghuni, clerk_user_id) VALUES ('X1', 'c-x1')");
    await q("INSERT INTO tr_push_subscription (id, endpoint, p256dh, auth, id_penghuni) VALUES ('s1','https://push/x1','p','a','X1')");
  });

  it("checkout mencabut tr_account dan mematikan langganan push", async () => {
    await q("UPDATE booking SET status_booking = 'Check-out' WHERE no_booking = 'B-81'");
    expect((await akunRaw("X1")).revoked_at).not.toBeNull();
    expect((await pushRaw("X1")).deleted_at).not.toBeNull();
  });

  it("checkout dibatalkan (kembali Check-in, id sama): akses pulih", async () => {
    await q("UPDATE booking SET status_booking = 'Check-in' WHERE no_booking = 'B-81'");
    expect((await akunRaw("X1")).revoked_at).toBeNull();
  });

  it("kamar ditimpa check-in penghuni baru: akun penghuni lama dicabut", async () => {
    await checkIn("B-81b", "X2", 81);
    expect((await akunRaw("X1")).revoked_at).not.toBeNull();
  });
});
