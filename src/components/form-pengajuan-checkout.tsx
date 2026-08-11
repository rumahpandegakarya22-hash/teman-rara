"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { kirimPengajuanCheckout, type PengajuanState } from "@/app/pengajuan/checkout/actions";
import { FlowButton } from "@/components/ui/flow-button";
import { GlassDateField } from "@/components/ui/glass-calendar";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <FlowButton
      type="submit"
      disabled={pending}
      className="btn-anim min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed disabled:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Mengirim…" : "Kirim Pengajuan"}
    </FlowButton>
  );
}

export default function FormPengajuanCheckout() {
  const [state, action] = useActionState<PengajuanState, FormData>(kirimPengajuanCheckout, {});
  const [tanggal, setTanggal] = useState("");

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-red-100 p-4 t-body-sm text-red-600">
          <AlertCircle size={20} className="shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <input type="hidden" name="tanggal_checkout" value={tanggal} />
      <div>
        <label htmlFor="tanggal_checkout_pick" className="t-label mb-2 block">
          Rencana tanggal keluar
        </label>
        <GlassDateField id="tanggal_checkout_pick" value={tanggal} onChange={setTanggal} />
      </div>

      <div>
        <label htmlFor="alasan" className="t-label mb-2 block">
          Alasan
        </label>
        <textarea
          id="alasan"
          name="alasan"
          required
          rows={3}
          maxLength={500}
          placeholder="Mis. lulus kuliah, pindah kerja, dll."
          className="w-full rounded-md border border-line bg-raised p-4 t-body focus:border-action"
        />
      </div>

      <div>
        <label htmlFor="catatan" className="t-label mb-2 block">
          Catatan <span className="text-fg-secondary">(opsional)</span>
        </label>
        <textarea
          id="catatan"
          name="catatan"
          rows={2}
          maxLength={500}
          placeholder="Hal lain yang perlu diketahui pengelola."
          className="w-full rounded-md border border-line bg-raised p-4 t-body focus:border-action"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
