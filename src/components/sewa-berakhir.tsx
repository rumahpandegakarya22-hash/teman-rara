import Link from "next/link";
import { DoorOpen } from "lucide-react";

/** Ditampilkan setelah penghuni check-out: akun tetap ada, aksesnya berhenti. */
export default function SewaBerakhir() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-sunken">
        <DoorOpen size={24} className="text-fg-secondary" aria-hidden />
      </span>
      <h1 className="t-h1">Masa sewa sudah berakhir</h1>
      <p className="t-body max-w-[40ch] text-fg-secondary">
        Terima kasih sudah tinggal di Kost Tiga Dara. Info kamar dan tagihan tidak bisa dibuka lagi.
        Kalau ini keliru, hubungi pengelola.
      </p>
      <Link
        href="/"
        className="btn-anim mt-2 inline-flex min-h-12 items-center rounded-md bg-action px-6 t-label text-on-action"
      >
        Ke Papan Informasi
      </Link>
    </main>
  );
}
