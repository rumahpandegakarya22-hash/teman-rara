"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { kirimPengajuanCheckout, type PengajuanState } from "@/app/pengajuan/checkout/actions";
import RatingInput from "@/components/rating-input";
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

      <fieldset className="flex flex-col gap-5 rounded-lg border border-line bg-raised/60 p-5">
        <legend className="t-h3 px-1">
          Exit survey <span className="t-body-sm text-fg-secondary">(opsional)</span>
        </legend>
        <p className="t-body-sm text-fg-secondary">
          Nilai 1 (sangat kurang) sampai 5 (sangat baik). Masukanmu membantu kami memperbaiki layanan.
        </p>
        <RatingInput nama="rating_kebersihan" label="Kebersihan" />
        <RatingInput nama="rating_fasilitas" label="Fasilitas" />
        <RatingInput nama="rating_pelayanan" label="Pelayanan pengelola" />
        <RatingInput nama="rating_harga" label="Kewajaran harga" />

        <fieldset>
          <legend className="t-label mb-2">Akan merekomendasikan Kost Tiga Dara?</legend>
          <div className="flex gap-4 t-body-sm">
            <label className="flex min-h-12 items-center gap-2">
              <input type="radio" name="rekomendasi" value="1" className="size-5" /> Ya
            </label>
            <label className="flex min-h-12 items-center gap-2">
              <input type="radio" name="rekomendasi" value="0" className="size-5" /> Tidak
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="saran" className="t-label mb-2 block">
            Saran <span className="text-fg-secondary">(opsional)</span>
          </label>
          <textarea
            id="saran"
            name="saran"
            rows={3}
            maxLength={500}
            className="w-full rounded-md border border-line bg-raised p-4 t-body focus:border-action"
          />
        </div>
      </fieldset>

      <SubmitButton />
    </form>
  );
}
