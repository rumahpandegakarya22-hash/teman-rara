"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { kirimPengajuanPindah, type PengajuanState } from "@/app/pengajuan/pindah/actions";
import type { KamarKosong } from "@/lib/pengajuan";
import { FlowButton } from "@/components/ui/flow-button";
import { GlassDateField } from "@/components/ui/glass-calendar";
import { OriginSelect } from "@/components/ui/origin-select";

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

export default function FormPengajuanPindah({ kamarKosong }: { kamarKosong: KamarKosong[] }) {
  const [state, action] = useActionState<PengajuanState, FormData>(kirimPengajuanPindah, {});
  const [tanggal, setTanggal] = useState("");
  const [kamarBaru, setKamarBaru] = useState("");

  if (kamarKosong.length === 0) {
    return (
      <p className="rounded-md border border-line bg-raised p-4 t-body-sm text-fg-secondary">
        Belum ada kamar kosong yang bisa dituju saat ini. Coba lagi nanti atau hubungi pengelola.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-red-100 p-4 t-body-sm text-red-600">
          <AlertCircle size={20} className="shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <input type="hidden" name="tanggal" value={tanggal} />
      <div>
        <label htmlFor="tanggal_pick" className="t-label mb-2 block">
          Rencana tanggal pindah
        </label>
        <GlassDateField id="tanggal_pick" value={tanggal} onChange={setTanggal} />
      </div>

      <input type="hidden" name="no_kamar_baru" value={kamarBaru} />
      <div>
        <label htmlFor="kamar_baru" className="t-label mb-2 block">
          Kamar tujuan
        </label>
        <OriginSelect
          id="kamar_baru"
          ariaLabel="Kamar tujuan"
          value={kamarBaru}
          onChange={setKamarBaru}
          placeholder="Pilih kamar…"
          options={kamarKosong.map((k) => ({
            value: String(k.no_kamar),
            label: k.tipe_kamar ? `Kamar ${k.no_kamar} · ${k.tipe_kamar}` : `Kamar ${k.no_kamar}`,
          }))}
        />
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
          placeholder="Mis. ingin kamar lebih luas, pindah lantai, dll."
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
