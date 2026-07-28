import Link from "next/link";
import { ChevronLeft, DoorClosed } from "lucide-react";
import EmptyState from "@/components/empty-state";
import FormPendaftaran from "@/components/form-pendaftaran";
import { getTipeKamarTersedia } from "./actions";

export const dynamic = "force-dynamic";

export default async function PendaftaranPage() {
  // Tipe kamar yang ada di database — ketersediaan per tanggal dicek belakangan
  // (langkah 1 form), jadi di sini cukup daftar tipenya saja.
  const tipeKamar = await getTipeKamarTersedia();

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

      {tipeKamar.length === 0 ? (
        <EmptyState
          icon={DoorClosed}
          title="Belum ada data kamar"
          description="Hubungi pengelola untuk masuk daftar tunggu."
        />
      ) : (
        <FormPendaftaran tipeKamar={tipeKamar} />
      )}
    </main>
  );
}
