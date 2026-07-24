"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Camera, ImageIcon, X } from "lucide-react";
import { kirimPengaduan, type PengaduanState } from "@/app/pengaduan/actions";
import { KATEGORI, LABEL_KATEGORI, type Kategori } from "@/lib/kategori";

const MAKS_FOTO = 3;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed disabled:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Mengirim…" : "Simpan Pengaduan"}
    </button>
  );
}

export default function FormPengaduan() {
  const [state, action] = useActionState<PengaduanState, FormData>(kirimPengaduan, {});
  // Ambil dari daftar, bukan tulis manual: nilainya harus persis sama dengan
  // CHECK(category) di tenant_complain, kalau meleset database menolak.
  const [kategori, setKategori] = useState<Kategori>(KATEGORI[0]);
  const [pratinjau, setPratinjau] = useState<{ url: string; file: File }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const bukaPemilih = (kamera: boolean) => {
    const input = fileRef.current;
    if (!input) return;
    if (kamera) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  };

  const tambahFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dipilih = Array.from(e.target.files ?? []);
    if (dipilih.length === 0) return;
    setPratinjau((lama) =>
      [...lama, ...dipilih.map((file) => ({ url: URL.createObjectURL(file), file }))].slice(0, MAKS_FOTO),
    );
    e.target.value = "";
  };

  const hapusFoto = (url: string) => {
    URL.revokeObjectURL(url);
    setPratinjau((lama) => lama.filter((p) => p.url !== url));
  };

  // Foto dikelola di state, jadi input file tidak ikut terkirim — kita
  // menyusun ulang FormData supaya isinya persis yang terlihat di pratinjau.
  const kirim = (formData: FormData) => {
    formData.delete("foto");
    for (const { file } of pratinjau) formData.append("foto", file);
    return action(formData);
  };

  return (
    <form action={kirim} className="flex flex-col gap-6">
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-red-100 p-4 t-body-sm text-red-600">
          <AlertCircle size={20} className="shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <fieldset>
        <legend className="t-label mb-3">Jenis kendala</legend>
        <input type="hidden" name="category" value={kategori} />
        <div className="flex flex-wrap gap-2">
          {KATEGORI.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKategori(k)}
              aria-pressed={kategori === k}
              className={`min-h-12 rounded-full border px-4 t-label ${
                kategori === k
                  ? "border-action bg-action text-on-action"
                  : "border-line bg-raised text-fg-secondary"
              }`}
            >
              {LABEL_KATEGORI[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="title" className="t-label mb-2 block">
          Judul singkat
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder="Contoh: Lampu kamar mati"
          className="min-h-12 w-full rounded-md border border-line bg-raised px-4 t-body focus:border-action"
        />
      </div>

      <div>
        <label htmlFor="description" className="t-label mb-2 block">
          Rincian kendala
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Ceritakan detailnya: sejak kapan, di bagian mana, seberapa mengganggu."
          className="w-full rounded-md border border-line bg-raised p-4 t-body focus:border-action"
        />
      </div>

      <div>
        <p className="t-label mb-2">
          Foto bukti <span className="text-fg-secondary">(opsional, maks {MAKS_FOTO})</span>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={tambahFoto}
          className="sr-only"
          aria-label="Foto bukti pengaduan"
        />

        {pratinjau.length > 0 && (
          <ul className="mb-3 grid grid-cols-3 gap-2">
            {pratinjau.map(({ url }) => (
              <li key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Pratinjau foto pengaduan"
                  className="aspect-square w-full rounded-md border border-line object-cover"
                />
                <button
                  type="button"
                  onClick={() => hapusFoto(url)}
                  aria-label="Hapus foto ini"
                  className="absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full bg-surface text-fg elev-2"
                >
                  <X size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        {pratinjau.length < MAKS_FOTO && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => bukaPemilih(true)}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-fg px-4 t-label"
            >
              <Camera size={20} aria-hidden />
              Kamera
            </button>
            <button
              type="button"
              onClick={() => bukaPemilih(false)}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-fg px-4 t-label"
            >
              <ImageIcon size={20} aria-hidden />
              Galeri
            </button>
          </div>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
