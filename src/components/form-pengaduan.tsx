"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Camera, ImageIcon, X } from "lucide-react";
import { kirimPengaduan, type PengaduanState } from "@/app/pengaduan/actions";
import {
  DESKRIPSI_JENIS,
  JENIS_MASUKAN,
  KATEGORI,
  LABEL_KATEGORI,
  jadiTiket,
  type JenisMasukan,
  type Kategori,
} from "@/lib/kategori";
import { FlowButton } from "@/components/ui/flow-button";
import { UploadCardShell } from "@/components/ui/file-upload-card";

const MAKS_FOTO = 3;

function SubmitButton({ jenis }: { jenis: JenisMasukan }) {
  const { pending } = useFormStatus();
  return (
    <FlowButton
      type="submit"
      disabled={pending}
      className="btn-anim min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed disabled:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Mengirim…" : jadiTiket(jenis) ? "Simpan Pengaduan" : `Kirim ${jenis}`}
    </FlowButton>
  );
}

export default function FormPengaduan() {
  const [state, action] = useActionState<PengaduanState, FormData>(kirimPengaduan, {});
  const [jenis, setJenis] = useState<JenisMasukan>(JENIS_MASUKAN[0]);
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

  const tambahBerkas = (dipilih: File[]) => {
    if (dipilih.length === 0) return;
    setPratinjau((lama) =>
      [...lama, ...dipilih.map((file) => ({ url: URL.createObjectURL(file), file }))].slice(0, MAKS_FOTO),
    );
  };

  const tambahFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    tambahBerkas(Array.from(e.target.files ?? []));
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
    // Foto yang sempat dipilih lalu jenisnya diganti ke Saran/Kritik tidak ikut
    // terkirim — kalau ikut, berkasnya terunggah ke Drive tanpa pernah dirujuk.
    if (jadiTiket(jenis)) for (const { file } of pratinjau) formData.append("foto", file);
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
        <legend className="t-label mb-3">Jenis masukan</legend>
        <input type="hidden" name="jenis" value={jenis} />
        <div className="flex flex-col gap-2">
          {JENIS_MASUKAN.map((j) => (
            <button
              key={j}
              type="button"
              onClick={() => setJenis(j)}
              aria-pressed={jenis === j}
              className={`btn-anim min-h-12 rounded-md border px-4 py-3 text-left ${
                jenis === j ? "border-action bg-raised" : "border-line bg-raised"
              }`}
            >
              <span className={`t-label block ${jenis === j ? "text-action" : ""}`}>{j}</span>
              <span className="t-caption text-fg-secondary">{DESKRIPSI_JENIS[j]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="t-label mb-3">Terkait</legend>
        <input type="hidden" name="category" value={kategori} />
        <div className="flex flex-wrap gap-2">
          {KATEGORI.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKategori(k)}
              aria-pressed={kategori === k}
              className={`btn-anim min-h-12 rounded-full border px-4 t-label ${
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
          {jadiTiket(jenis) ? "Rincian kendala" : "Rincian masukan"}
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

      {/* Foto hanya relevan untuk Komplain — Saran/Kritik masuk tabel feedback
          yang memang tidak punya relasi lampiran. */}
      <div hidden={!jadiTiket(jenis)}>
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

        {/* Item 6 — layout animation: grid foto reflow rapi saat foto ditambah/dihapus. */}
        <AnimatePresence>
          {pratinjau.length > 0 && (
            <motion.ul layout className="mb-3 grid grid-cols-3 gap-2">
              {pratinjau.map(({ url }) => (
                <motion.li
                  layout
                  key={url}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  className="relative"
                >
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
                    className="btn-anim absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full bg-surface text-fg elev-2"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {pratinjau.length < MAKS_FOTO && (
          <UploadCardShell
            judul="Foto bukti"
            deskripsi={`Ambil foto langsung atau pilih dari galeri (maks ${MAKS_FOTO})`}
            petunjuk="JPG, PNG, atau WebP."
            onDropFiles={tambahBerkas}
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
      </div>

      <SubmitButton jenis={jenis} />
    </form>
  );
}
