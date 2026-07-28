import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { ChevronLeft, DoorClosed } from "lucide-react";
import EmptyState from "@/components/empty-state";
import FormPendaftaran from "@/components/form-pendaftaran";
import { db } from "@/db";
import { activeTenant, kamar } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Kamar kosong = tidak punya baris di active_tenant (trigger menghapusnya saat check-out). */
function getKamarKosong() {
  return db
    .select({ no_kamar: kamar.no_kamar, tipe_kamar: kamar.tipe_kamar })
    .from(kamar)
    .leftJoin(activeTenant, eq(activeTenant.kamar_id, kamar.id_kamar))
    .where(isNull(activeTenant.kamar_id))
    .orderBy(asc(kamar.no_kamar));
}

export default async function PendaftaranPage() {
  const kamarTersedia = await getKamarKosong();

  return (
    <main className="px-4 pt-4">
      <div className="safe-top" />
      <Link
        href="/"
        className="btn-anim -ml-2 inline-flex min-h-12 items-center gap-1 px-2 t-label text-fg-secondary"
      >
        <ChevronLeft size={20} className="icon-flow" aria-hidden />
        Beranda
      </Link>

      <header className="mb-6 mt-2">
        <p className="t-overline text-fg-secondary">Kost Tiga Dara</p>
        <h1 className="t-h1 mt-1">Pendaftaran Penghuni Baru</h1>
        <p className="t-body-sm mt-2 text-fg-secondary">
          Isi formulir ini untuk mengajukan kamar. Tidak perlu punya akun. Pengelola akan menghubungi
          kamu untuk verifikasi sebelum check-in.
        </p>
      </header>

      {kamarTersedia.length === 0 ? (
        <EmptyState
          icon={DoorClosed}
          title="Semua kamar sedang terisi"
          description="Hubungi pengelola untuk masuk daftar tunggu."
        />
      ) : (
        <FormPendaftaran kamarTersedia={kamarTersedia} />
      )}
    </main>
  );
}
