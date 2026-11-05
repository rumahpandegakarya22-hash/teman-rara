import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { buatDbUji } from "./helpers/db-uji";
import {
  activeTenant,
  booking,
  invoiceSewa,
  kamar,
  occupancyHistory,
  tenantComplain,
  trComplainPhoto,
  trComplainSync,
  trPaymentProof,
  trPendaftaran,
} from "@/db/schema";
import { JENIS_MASUKAN, KATEGORI } from "@/lib/kategori";

let uji: Awaited<ReturnType<typeof buatDbUji>>;
vi.mock("@/db", async () => {
  uji = await buatDbUji();
  return { db: uji.db };
});

let ip = "1.1.1.1";
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "cf-connecting-ip": ip }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
const telegram = vi.fn<(teks: string) => Promise<{ ok: boolean }>>(async () => ({ ok: true }));
vi.mock("@/lib/telegram", async (asli) => ({
  ...(await asli<typeof import("@/lib/telegram")>()),
  kirimTelegram: telegram,
}));
const getPenghuniAktif = vi.fn();
vi.mock("@/lib/tenant", () => ({ getPenghuniAktif }));
vi.mock("@/lib/storage", async (asli) => ({
  ...(await asli<typeof import("@/lib/storage")>()),
  simpanGambar: async () => `/api/berkas/FAKEFILE${Math.random().toString(36).slice(2, 12)}`,
}));

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const foto = (nama = "a.png") => new File([PNG], nama, { type: "image/png" });

async function penghuni(id: string, noKamar: number) {
  await uji.db.insert(kamar).values({ id_kamar: `K${noKamar}`, no_kamar: noKamar, tipe_kamar: "Standard" });
  await uji.db
    .insert(occupancyHistory)
    .values({ id_penghuni: id, nama: id, no_kamar: String(noKamar), tanggal_mulai: "2026-01-01" });
  await uji.db
    .insert(activeTenant)
    .values({ kamar_id: `K${noKamar}`, id_penghuni: id, nama_lengkap: id, no_kamar: String(noKamar) });
  getPenghuniAktif.mockResolvedValue({ id_penghuni: id, nama: id, no_kamar: noKamar });
}

// redirect() Next melempar error khusus; di test dijadikan nilai kembalian.
async function jalankan(fn: () => Promise<unknown>) {
  try {
    return await fn();
  } catch (e) {
    const m = (e as Error).message;
    if (m.startsWith("REDIRECT:")) return { redirect: m.slice(9) };
    throw e;
  }
}

beforeAll(async () => {
  await import("@/db");
});
beforeEach(() => {
  getPenghuniAktif.mockReset();
  telegram.mockClear();
});

describe("unggahBukti", () => {
  it("menyimpan bukti untuk invoice sendiri, menolak invoice orang lain, membatasi 10 per jam", async () => {
    const { unggahBukti } = await import("@/app/kamar/actions");
    await penghuni("U1", 11);
    await uji.db
      .insert(occupancyHistory)
      .values({ id_penghuni: "LAIN", nama: "LAIN", no_kamar: "99", tanggal_mulai: "2026-01-01" });
    const [milik] = await uji.db
      .insert(invoiceSewa)
      .values({ no_inv: "M", id_penghuni: "U1", nama: "U1", no_kamar: "11", grand_total: 1 })
      .returning({ id: invoiceSewa.id });
    const [lain] = await uji.db
      .insert(invoiceSewa)
      .values({ no_inv: "L", id_penghuni: "LAIN", nama: "LAIN", no_kamar: "99", grand_total: 1 })
      .returning({ id: invoiceSewa.id });

    const form = (id: number) => {
      const f = new FormData();
      f.set("invoice_sewa_id", String(id));
      f.set("bukti", foto());
      return f;
    };

    // Percobaan ke-1 (invoice orang lain) ikut dihitung kuota.
    expect((await unggahBukti({}, form(lain.id))).error).toBe("Tagihan tidak ditemukan.");
    expect((await unggahBukti({}, form(milik.id))).sukses).toBeTruthy();
    expect(await uji.db.select().from(trPaymentProof).where(eq(trPaymentProof.id_penghuni, "U1"))).toHaveLength(1);
    expect(telegram.mock.calls.at(-1)?.[0]).toContain("Bukti bayar baru");
    expect(telegram.mock.calls.at(-1)?.[0]).toContain("U1 (Kamar 11)");

    for (let i = 0; i < 8; i++) await unggahBukti({}, form(milik.id)); // kuota habis di percobaan ke-10
    const kelebihan = await unggahBukti({}, form(milik.id));
    expect(kelebihan.error).toMatch(/Terlalu banyak unggahan/);
  });

  it("menolak berkas yang isinya bukan gambar", async () => {
    const { unggahBukti } = await import("@/app/kamar/actions");
    await penghuni("U2", 12);
    const [inv] = await uji.db
      .insert(invoiceSewa)
      .values({ no_inv: "X", id_penghuni: "U2", nama: "U2", no_kamar: "12", grand_total: 1 })
      .returning({ id: invoiceSewa.id });
    const f = new FormData();
    f.set("invoice_sewa_id", String(inv.id));
    f.set("bukti", new File(["teks biasa"], "a.png", { type: "image/png" }));
    expect((await unggahBukti({}, f)).error).toMatch(/tidak sesuai/);
  });
});

describe("kirimPengaduan", () => {
  const isiForm = (judul: string) => {
    const f = new FormData();
    f.set("jenis", JENIS_MASUKAN[0]);
    f.set("category", KATEGORI[0]);
    f.set("title", judul);
    f.set("description", "Deskripsi kendala yang cukup panjang");
    return f;
  };

  it("membuat pengaduan + sync + foto lalu redirect ke detail", async () => {
    const { kirimPengaduan } = await import("@/app/pengaduan/actions");
    await penghuni("G1", 21);
    const f = isiForm("Wifi mati");
    f.append("foto", foto());
    const hasil = (await jalankan(() => kirimPengaduan({}, f))) as { redirect: string };
    expect(hasil.redirect).toMatch(/^\/pengaduan\/CMP-\d{8}-[0-9a-f]{8}$/);
    const id = hasil.redirect.split("/").pop()!;
    expect(await uji.db.select().from(tenantComplain).where(eq(tenantComplain.id_complain, id))).toHaveLength(1);
    expect(await uji.db.select().from(trComplainSync).where(eq(trComplainSync.id_complain, id))).toHaveLength(1);
    expect(await uji.db.select().from(trComplainPhoto).where(eq(trComplainPhoto.id_complain, id))).toHaveLength(1);
    expect(telegram.mock.calls.at(-1)?.[0]).toContain("Pengaduan baru");
    expect(telegram.mock.calls.at(-1)?.[0]).toContain("Wifi mati");
  });

  it("Saran/Kritik masuk ke feedback dan juga memberi tahu pengelola", async () => {
    const { kirimPengaduan } = await import("@/app/pengaduan/actions");
    await penghuni("G3", 23);
    const f = isiForm("Tambah jemuran");
    f.set("jenis", "Saran");
    expect(await jalankan(() => kirimPengaduan({}, f))).toEqual({ redirect: "/pengaduan?terkirim=1" });
    expect(telegram.mock.calls.at(-1)?.[0]).toContain("Saran baru");
  });

  it("menolak lebih dari 3 foto", async () => {
    const { kirimPengaduan } = await import("@/app/pengaduan/actions");
    await penghuni("G2", 22);
    const f = isiForm("Air mati");
    for (let i = 0; i < 4; i++) f.append("foto", foto(`f${i}.png`));
    expect(((await kirimPengaduan({}, f)) as { error?: string }).error).toMatch(/Maksimal 3 foto/);
  });
});

describe("pendaftaran publik", () => {
  const isi = (noKamar: number) => {
    const f = new FormData();
    const v: Record<string, string> = {
      email: "calon@x.com",
      nama_lengkap: "Calon Penghuni",
      nama_panggilan: "Calon",
      asal_daerah: "Bandung",
      no_hp: "081234567890",
      no_kamar: String(noKamar),
      rencana_masuk: "2027-01-10",
      pekerjaan: "Karyawati",
      institusi: "PT Maju",
      darurat1_nama: "Ibu",
      darurat1_nomor: "081298765432",
      darurat1_relasi: "Ibu",
      jumlah_gadget: "2",
      barang_elektronik: "Laptop",
      nopol: "d 1234 ab",
    };
    for (const [k, val] of Object.entries(v)) f.set(k, val);
    f.set("scan_identitas", foto("ktp.png"));
    f.set("scan_bukti_dp", foto("dp.png"));
    return f;
  };

  it("menyimpan booking Pending + data pendaftaran; kamar yang sama tidak bisa dipesan dua kali", async () => {
    const { kirimPendaftaran } = await import("@/app/pendaftaran/actions");
    await uji.db.insert(kamar).values({ id_kamar: "K31", no_kamar: 31, tipe_kamar: "Standard" });
    ip = "2.2.2.2";
    const hasil = (await jalankan(() => kirimPendaftaran({}, isi(31)))) as { redirect: string };
    expect(hasil.redirect).toMatch(/^\/pendaftaran\/terkirim\?no=BK-\d{4}-001$/);
    const no = decodeURIComponent(hasil.redirect.split("no=")[1]);
    const [b] = await uji.db.select().from(booking).where(eq(booking.no_booking, no));
    expect(b.status_booking).toBe("Pending");
    const [p] = await uji.db.select().from(trPendaftaran).where(eq(trPendaftaran.no_booking, no));
    expect(p.nopol).toBe("D 1234 AB");
    expect(p.no_hp).toBe("6281234567890");
    expect(telegram.mock.calls.at(-1)?.[0]).toContain("Pendaftaran baru");
    expect(telegram.mock.calls.at(-1)?.[0]).toContain(no);

    const ulang = (await kirimPendaftaran({}, isi(31))) as { error?: string };
    expect(ulang.error).toMatch(/tidak tersedia/);
  });

  it("kiriman ke-4 dari IP yang sama dalam sejam ditolak rate limit", async () => {
    const { kirimPendaftaran } = await import("@/app/pendaftaran/actions");
    ip = "3.3.3.3";
    const hasil: string[] = [];
    for (let i = 0; i < 4; i++) {
      hasil.push(((await kirimPendaftaran({}, new FormData())) as { error?: string }).error ?? "");
    }
    expect(hasil.slice(0, 3).every((e) => e.length > 0 && !/Terlalu banyak/.test(e))).toBe(true);
    expect(hasil[3]).toMatch(/Terlalu banyak pengiriman/);
  });

  it("IP lain tidak terkena batas IP tersebut", async () => {
    const { kirimPendaftaran } = await import("@/app/pendaftaran/actions");
    ip = "4.4.4.4";
    expect(((await kirimPendaftaran({}, new FormData())) as { error?: string }).error).not.toMatch(/Terlalu banyak/);
  });
});

describe("simpanProfil", () => {
  it("kirim notifikasi hanya saat email/HP berubah", async () => {
    const { simpanProfil } = await import("@/app/profil/actions");
    await penghuni("P1", 71);
    getPenghuniAktif.mockResolvedValue({
      id_penghuni: "P1",
      nama: "P1",
      no_kamar: 71,
      email: "lama@x.id",
      no_hp: "081111111111",
    });
    const form = (email: string, hp: string) => {
      const f = new FormData();
      f.set("email", email);
      f.set("no_hp", hp);
      return f;
    };

    expect((await simpanProfil({}, form("lama@x.id", "081111111111"))).sukses).toBeTruthy();
    expect(telegram).not.toHaveBeenCalled();

    await simpanProfil({}, form("baru@x.id", "081111111111"));
    const pesan = telegram.mock.calls.at(-1)?.[0] ?? "";
    expect(pesan).toContain("lama@x.id → baru@x.id");
    expect(pesan).not.toContain("HP:");
  });
});

describe("pindah kamar dinonaktifkan", () => {
  it("menolak pengajuan tanpa menyimpan", async () => {
    const { kirimPengajuanPindah } = await import("@/app/pengajuan/pindah/actions");
    await penghuni("P2", 72);
    const r = await kirimPengajuanPindah({}, new FormData());
    expect(r.error).toMatch(/dinonaktifkan/);
    expect(telegram).not.toHaveBeenCalled();
  });
});
