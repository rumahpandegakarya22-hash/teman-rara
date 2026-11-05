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
});
