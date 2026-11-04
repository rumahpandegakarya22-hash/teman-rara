import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { buatDbUji } from "./helpers/db-uji";
import { activeTenant, kamar, occupancyHistory, trAccount } from "@/db/schema";

let uji: Awaited<ReturnType<typeof buatDbUji>>;
vi.mock("@/db", async () => {
  uji = await buatDbUji();
  return { db: uji.db };
});

let clerkId = "clerk-1";
vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: async () => {} },
  currentUser: async () => ({ id: clerkId, primaryEmailAddress: { emailAddress: `${clerkId}@x.com` } }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "cf-connecting-ip": "9.9.9.9" }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const UMUM = /tidak cocok/;

async function penghuni(id: string, noKamar: number, hp: string) {
  await uji.db.insert(kamar).values({ id_kamar: `K${noKamar}`, no_kamar: noKamar });
  await uji.db.insert(occupancyHistory).values({ id_penghuni: id, nama: id, no_kamar: String(noKamar), tanggal_mulai: "2026-01-01" });
  await uji.db.insert(activeTenant).values({ kamar_id: `K${noKamar}`, id_penghuni: id, nama_lengkap: id, no_kamar: String(noKamar), no_hp: hp });
}

const form = (no_kamar: string, no_hp: string, kode?: string) => {
  const f = new FormData();
  f.set("no_kamar", no_kamar);
  f.set("no_hp", no_hp);
  if (kode !== undefined) f.set("kode", kode);
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

describe("klaimAkun dengan kode klaim", () => {
  let buatKode: typeof import("@/lib/kode-klaim").buatKodeKlaim;
  beforeAll(async () => {
    await import("@/db");
    ({ buatKodeKlaim: buatKode } = await import("@/lib/kode-klaim"));
  });

  it("kamar + HP + kode benar: akun tertaut dan kode hangus", async () => {
    clerkId = "c-ok";
    await penghuni("P1", 1, "081111111111");
    const kode = await buatKode("P1");
    expect(await klaim(form("1", "+62 811-1111-1111", kode))).toEqual({ redirect: "/kamar" });
    expect((await akun("P1"))[0].clerk_user_id).toBe("c-ok");
    clerkId = "c-lain";
    expect((await klaim(form("1", "081111111111", kode)) as { error?: string }).error).toBeTruthy();
  });

  it("kode salah: pesan seragam, tidak ada akun, kode asli masih berlaku", async () => {
    clerkId = "c-salah";
    await penghuni("P2", 2, "082222222222");
    const kode = await buatKode("P2");
    expect(((await klaim(form("2", "082222222222", "SALAHSALAH"))) as { error: string }).error).toMatch(UMUM);
    expect(await akun("P2")).toHaveLength(0);
    expect(await klaim(form("2", "082222222222", kode))).toEqual({ redirect: "/kamar" });
  });

  it("HP salah dengan kode benar: ditolak dan kode TIDAK hangus", async () => {
    clerkId = "c-hp";
    await penghuni("P3", 3, "083333333333");
    const kode = await buatKode("P3");
    expect(((await klaim(form("3", "089999999999", kode))) as { error: string }).error).toMatch(UMUM);
    expect(await klaim(form("3", "083333333333", kode))).toEqual({ redirect: "/kamar" });
  });

  it("tanpa kode: ditolak oleh validasi", async () => {
    clerkId = "c-nokode";
    await penghuni("P4", 4, "084444444444");
    await buatKode("P4");
    expect(((await klaim(form("4", "084444444444"))) as { error?: string }).error).toBeTruthy();
    expect(await akun("P4")).toHaveLength(0);
  });

  it("penghuni tanpa kode yang pernah dibuat: tidak bisa klaim", async () => {
    clerkId = "c-tanpa-kode-db";
    await penghuni("P5", 5, "085555555555");
    expect(((await klaim(form("5", "085555555555", "ABCDEFGH"))) as { error: string }).error).toMatch(UMUM);
  });

  it("akun yang sudah tertaut boleh klaim ulang tanpa kode", async () => {
    clerkId = "c-ulang";
    await penghuni("P6", 6, "086666666666");
    const kode = await buatKode("P6");
    await klaim(form("6", "086666666666", kode));
    expect(await klaim(form("6", "086666666666", "TIDAKPERLU"))).toEqual({ redirect: "/kamar" });
  });
});
