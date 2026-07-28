"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { batalkanPengaduan, type BatalState } from "@/app/pengaduan/actions";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-anim min-h-12 w-full rounded-md border border-line px-6 t-label text-danger active:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Membatalkan…" : "Ya, batalkan"}
    </button>
  );
}

/**
 * Membatalkan pengaduan minta konfirmasi dulu, bukan langsung jalan: aksinya
 * tidak bisa dibalikkan sendiri oleh penghuni, dan tombol ini duduk di layar
 * kecil yang gampang tersenggol.
 * Item 6 — layout animation: tinggi kartu ikut menyesuaikan saat berpindah
 * antara tombol tunggal dan panel konfirmasi.
 */
export default function TombolBatalPengaduan({ idComplain }: { idComplain: string }) {
  const [state, action] = useActionState<BatalState, FormData>(batalkanPengaduan, {});
  const [konfirmasi, setKonfirmasi] = useState(false);

  return (
    <motion.section layout className="rounded-lg border border-line bg-raised p-5 elev-1">
      {state.error && (
        <p role="alert" className="mb-4 flex items-start gap-2 t-body-sm text-danger">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      {konfirmasi ? (
        <motion.div layout className="flex flex-col gap-4">
          <p className="t-body-sm text-fg-secondary">
            Pengaduan ini akan ditandai dibatalkan dan tidak lagi ditindaklanjuti pengelola. Kalau
            kendalanya masih ada, kamu bisa mengajukan pengaduan baru.
          </p>
          <form action={action} className="flex flex-col gap-2">
            <input type="hidden" name="id_complain" value={idComplain} />
            <Tombol />
            <button
              type="button"
              onClick={() => setKonfirmasi(false)}
              className="btn-anim min-h-12 w-full rounded-md px-6 t-label text-fg-secondary active:bg-sunken"
            >
              Jangan jadi
            </button>
          </form>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={() => setKonfirmasi(true)}
          className="btn-anim min-h-12 w-full rounded-md border border-line px-6 t-label text-fg-secondary active:bg-sunken"
        >
          Batalkan pengaduan
        </button>
      )}
    </motion.section>
  );
}
