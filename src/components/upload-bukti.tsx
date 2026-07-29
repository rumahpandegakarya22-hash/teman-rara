"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Camera, CheckCircle2, ImageIcon, X } from "lucide-react";
import { unggahBukti, type UploadState } from "@/app/kamar/actions";
import { UploadCardShell } from "@/components/ui/file-upload-card";
import { FlowButton } from "@/components/ui/flow-button";

function SubmitButton({ aktif }: { aktif: boolean }) {
  const { pending } = useFormStatus();
  return (
    <FlowButton
      type="submit"
      disabled={!aktif || pending}
      className="btn-anim min-h-12 flex-1 rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed disabled:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Mengirim…" : "Kirim Bukti"}
    </FlowButton>
  );
}

export default function UploadBukti({ invoiceSewaId }: { invoiceSewaId: number }) {
  const [state, action] = useActionState<UploadState, FormData>(unggahBukti, {});
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Satu input saja, supaya FormData selalu berisi berkas yang benar-benar dipilih.
  // `capture` diatur lewat DOM tepat sebelum dialog dibuka, bukan lewat state.
  const bukaPemilih = (kamera: boolean) => {
    const input = fileRef.current;
    if (!input) return;
    if (kamera) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  };

  const pilih = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPratinjau((lama) => {
      if (lama) URL.revokeObjectURL(lama);
      return URL.createObjectURL(file);
    });
  };

  // Berkas hasil seret-lepas ditulis balik ke input asli lewat DataTransfer,
  // supaya tetap ikut FormData saat form disubmit.
  const jatuhkan = (files: File[]) => {
    const file = files[0];
    const input = fileRef.current;
    if (!file || !input) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    setPratinjau((lama) => {
      if (lama) URL.revokeObjectURL(lama);
      return URL.createObjectURL(file);
    });
  };

  const batal = () => {
    if (pratinjau) URL.revokeObjectURL(pratinjau);
    setPratinjau(null);
    formRef.current?.reset();
  };

  return (
    <section className="rounded-lg border border-line bg-raised p-5 elev-1">
      <h2 className="t-h3 mb-1">Unggah Bukti Bayar</h2>
      <p className="t-body-sm mb-4 text-fg-secondary">
        Foto struk atau tangkapan layar transfer. Maksimal 5 MB.
      </p>

      {state.sukses && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-md bg-[#E6F0E6] p-4 t-body-sm text-success">
          <CheckCircle2 size={20} className="shrink-0" aria-hidden />
          {state.sukses}
        </p>
      )}
      {state.error && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-md bg-red-100 p-4 t-body-sm text-red-600">
          <AlertCircle size={20} className="shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <form ref={formRef} action={action}>
        <input type="hidden" name="invoice_sewa_id" value={invoiceSewaId} />

        <input
          ref={fileRef}
          type="file"
          name="bukti"
          accept="image/jpeg,image/png,image/webp"
          onChange={pilih}
          className="sr-only"
          aria-label="Foto bukti pembayaran"
        />

        {pratinjau ? (
          <div className="relative">
            {/* Pratinjau lokal (blob URL) — next/image tidak berlaku di sini. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pratinjau}
              alt="Pratinjau bukti pembayaran"
              className="max-h-72 w-full rounded-md border border-line object-contain"
            />
            <button
              type="button"
              onClick={batal}
              aria-label="Hapus foto yang dipilih"
              className="btn-anim absolute right-2 top-2 flex size-12 items-center justify-center rounded-full bg-surface/90 text-fg"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        ) : (
          <UploadCardShell
            judul="Bukti pembayaran"
            deskripsi="Foto struk atau tangkapan layar transfer"
            petunjuk="JPG, PNG, atau WebP. Maksimal 5 MB."
            onDropFiles={jatuhkan}
          >
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => bukaPemilih(true)}
                className="btn-anim flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-fg px-4 t-label"
              >
                <Camera size={20} className="icon-flow" aria-hidden />
                Kamera
              </button>
              <button
                type="button"
                onClick={() => bukaPemilih(false)}
                className="btn-anim flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-fg px-4 t-label"
              >
                <ImageIcon size={20} className="icon-flow" aria-hidden />
                Galeri
              </button>
            </div>
          </UploadCardShell>
        )}

        {pratinjau && (
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={batal}
              className="btn-anim min-h-12 rounded-md border border-fg px-6 t-label"
            >
              Batal
            </button>
            <SubmitButton aktif={!!pratinjau} />
          </div>
        )}
      </form>
    </section>
  );
}
