"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { batalkanCheckout } from "@/app/pengajuan/checkout/actions";
import { batalkanPindah } from "@/app/pengajuan/pindah/actions";
import { FlowButton } from "@/components/ui/flow-button";

type BatalState = { error?: string };

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <FlowButton
      type="submit"
      disabled={pending}
      rippleClassName="bg-sunken"
      className="btn-anim min-h-12 w-full rounded-md border border-line px-6 t-label text-danger active:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Membatalkan…" : "Ya, batalkan"}
    </FlowButton>
  );
}

export default function TombolBatalPengajuan({ jenis, id }: { jenis: "checkout" | "pindah"; id: string }) {
  const aksi = jenis === "checkout" ? batalkanCheckout : batalkanPindah;
  const [state, action] = useActionState<BatalState, FormData>(aksi, {});
  const [konfirmasi, setKonfirmasi] = useState(false);

  return (
    <motion.div layout className="mt-4">
      {state.error && (
        <p role="alert" className="mb-3 flex items-start gap-2 t-body-sm text-danger">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      {konfirmasi ? (
        <form action={action} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={id} />
          <Tombol />
          <button
            type="button"
            onClick={() => setKonfirmasi(false)}
            className="btn-anim min-h-12 w-full rounded-md px-6 t-label text-fg-secondary active:bg-sunken"
          >
            Jangan jadi
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setKonfirmasi(true)}
          className="btn-anim min-h-12 w-full rounded-md border border-line px-6 t-label text-fg-secondary active:bg-sunken"
        >
          Batalkan pengajuan
        </button>
      )}
    </motion.div>
  );
}
