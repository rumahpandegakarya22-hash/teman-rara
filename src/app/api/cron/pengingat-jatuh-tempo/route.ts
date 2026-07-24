import { NextResponse } from "next/server";
import { and, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { invoiceSewa } from "@/db/schema";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { kirimKePenghuni } from "@/lib/push";

export const dynamic = "force-dynamic";

const HARI_SEBELUM = 3;

/**
 * Dipanggil Vercel Cron sekali sehari. Jatuh tempo memakai
 * `invoice_sewa.periode_akhir` sesuai keputusan Owner. Belum bayar ditandai
 * `tanggal_pembayaran` yang masih NULL, mengikuti konvensi sistem existing.
 *
 * Endpoint ini publik secara jaringan, jadi diamankan dengan CRON_SECRET dan
 * tidak boleh mengandalkan sesi.
 */
export async function GET(request: Request) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia || request.headers.get("authorization") !== `Bearer ${rahasia}`) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const hariIni = new Date().toISOString().slice(0, 10);
  const batas = new Date(Date.now() + HARI_SEBELUM * 86_400_000).toISOString().slice(0, 10);

  try {
    const jatuhTempo = await db
      .select({
        id_penghuni: invoiceSewa.id_penghuni,
        no_inv: invoiceSewa.no_inv,
        grand_total: invoiceSewa.grand_total,
        periode_akhir: invoiceSewa.periode_akhir,
      })
      .from(invoiceSewa)
      .where(
        and(
          isNull(invoiceSewa.tanggal_pembayaran),
          gte(invoiceSewa.periode_akhir, hariIni),
          lte(invoiceSewa.periode_akhir, batas),
        ),
      );

    let terkirim = 0;
    for (const t of jatuhTempo) {
      if (!t.id_penghuni || !t.periode_akhir) continue;
      const hasil = await kirimKePenghuni(t.id_penghuni, {
        title: "Pengingat pembayaran sewa",
        body: `${t.no_inv} sebesar ${formatRupiah(t.grand_total ?? 0)} jatuh tempo ${formatTanggal(t.periode_akhir)}.`,
        url: "/kamar",
      });
      terkirim += hasil.terkirim;
    }

    return NextResponse.json({ tagihan: jatuhTempo.length, notifikasi_terkirim: terkirim });
  } catch {
    return NextResponse.json({ error: "Gagal memproses pengingat" }, { status: 500 });
  }
}
