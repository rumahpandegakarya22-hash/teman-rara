"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cekKetersediaan, kirimPendaftaran, type KamarOpsi, type PendaftaranState } from "@/app/pendaftaran/actions";
import { Stepper } from "@/components/ui/stepper";

const LANGKAH = ["Ketersediaan", "Biodata", "Dokumen"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-anim min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed disabled:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Mengirim…" : "Kirim Pendaftaran"}
    </button>
  );
}

function Teks({
  nama,
  label,
  wajib,
  tipe = "text",
  bantuan,
  ...rest
}: {
  nama: string;
  label: string;
  wajib?: boolean;
  tipe?: string;
  bantuan?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={nama} className="t-label mb-2 block">
        {label} {!wajib && <span className="text-fg-secondary">(opsional)</span>}
      </label>
      <input
        id={nama}
        name={nama}
        type={tipe}
        required={wajib}
        className="min-h-12 w-full rounded-md border border-line bg-raised px-4 t-body focus:border-action"
        {...rest}
      />
      {bantuan && <p className="t-caption mt-1 text-fg-secondary">{bantuan}</p>}
    </div>
  );
}

function Seksi({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-line bg-raised/60 p-5">
      <legend className="t-h3 px-1">{judul}</legend>
      <div className="mt-3 flex flex-col gap-5">{children}</div>
    </fieldset>
  );
}

function TombolLangkah({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-anim min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed disabled:bg-sunken disabled:text-fg-disabled"
    >
      {label}
    </button>
  );
}

export default function FormPendaftaran({ tipeKamar }: { tipeKamar: string[] }) {
  const [state, action] = useActionState<PendaftaranState, FormData>(kirimPendaftaran, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [pekerjaan, setPekerjaan] = useState("Mahasiswi");

  // Langkah 0 — Ketersediaan: tanggal + tipe kamar dulu, baru kamar spesifik.
  const [langkah, setLangkah] = useState(0);
  const [rencanaMasuk, setRencanaMasuk] = useState("");
  const [tipeDipilih, setTipeDipilih] = useState(tipeKamar[0] ?? "");
  const [noKamar, setNoKamar] = useState("");
  const [kamarTersedia, setKamarTersedia] = useState<KamarOpsi[]>([]);
  const [sudahCek, setSudahCek] = useState(false);
  const [errorCek, setErrorCek] = useState("");
  const [pendingCek, startCek] = useTransition();

  function handleCekKetersediaan() {
    if (!rencanaMasuk || !tipeDipilih) {
      setErrorCek("Isi tanggal dan tipe kamar dulu.");
      return;
    }
    startCek(async () => {
      const hasil = await cekKetersediaan(rencanaMasuk, tipeDipilih);
      setErrorCek(hasil.error ?? "");
      setKamarTersedia(hasil.kamar);
      setNoKamar("");
      setSudahCek(true);
    });
  }

  function lanjutKeBiodata() {
    if (!noKamar) return;
    setLangkah(1);
  }

  function lanjutKeDokumen() {
    // Field wajib langkah Biodata divalidasi native browser — field langkah
    // lain (hidden/display:none) otomatis dilewati constraint validation.
    if (formRef.current?.reportValidity()) setLangkah(2);
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-6">
      <Stepper steps={LANGKAH} currentIndex={langkah} />

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-red-100 p-4 t-body-sm text-red-600">
          <AlertCircle size={20} className="shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      {/* Nilai final dikirim lewat hidden input supaya tetap ikut FormData
          walau seksi tampilannya sudah pindah ke langkah lain. */}
      <input type="hidden" name="rencana_masuk" value={rencanaMasuk} />
      <input type="hidden" name="no_kamar" value={noKamar} />

      <div className={langkah === 0 ? "flex flex-col gap-5" : "hidden"}>
        <Seksi judul="Rencana Masuk">
          <div>
            <label htmlFor="tanggal_cek" className="t-label mb-2 block">
              Rencana tanggal masuk
            </label>
            <input
              id="tanggal_cek"
              type="date"
              value={rencanaMasuk}
              onChange={(e) => {
                setRencanaMasuk(e.target.value);
                setSudahCek(false);
              }}
              className="min-h-12 w-full rounded-md border border-line bg-raised px-4 t-body focus:border-action"
            />
          </div>

          <div>
            <label htmlFor="tipe_cek" className="t-label mb-2 block">
              Tipe kamar
            </label>
            <select
              id="tipe_cek"
              value={tipeDipilih}
              onChange={(e) => {
                setTipeDipilih(e.target.value);
                setSudahCek(false);
              }}
              className="min-h-12 w-full rounded-md border border-line bg-raised px-4 t-body focus:border-action"
            >
              {tipeKamar.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <TombolLangkah
            label={pendingCek ? "Mengecek…" : "Cek Ketersediaan"}
            onClick={handleCekKetersediaan}
            disabled={pendingCek || !rencanaMasuk || !tipeDipilih}
          />

          {errorCek && (
            <p role="alert" className="flex items-start gap-2 rounded-md bg-red-100 p-4 t-body-sm text-red-600">
              <AlertCircle size={20} className="shrink-0" aria-hidden />
              {errorCek}
            </p>
          )}

          {sudahCek && !errorCek && (
            <div>
              {kamarTersedia.length === 0 ? (
                <p className="t-body-sm text-fg-secondary">
                  Tidak ada kamar tipe ini yang tersedia pada tanggal itu. Coba tanggal atau tipe lain.
                </p>
              ) : (
                <>
                  <p className="t-label mb-2">Pilih kamar</p>
                  <div className="grid grid-cols-3 gap-2">
                    {kamarTersedia.map((k) => {
                      const aktif = String(k.no_kamar) === noKamar;
                      return (
                        <button
                          key={k.no_kamar}
                          type="button"
                          onClick={() => setNoKamar(String(k.no_kamar))}
                          className={`btn-anim flex min-h-12 flex-col items-center justify-center rounded-md border p-2 t-body-sm ${
                            aktif
                              ? "border-action bg-action text-on-action"
                              : "border-line bg-raised text-fg"
                          }`}
                        >
                          <span className="font-semibold">{k.no_kamar}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </Seksi>

        <TombolLangkah label="Lanjut ke Biodata" onClick={lanjutKeBiodata} disabled={!noKamar} />
      </div>

      <div className={langkah === 1 ? "flex flex-col gap-5" : "hidden"}>
        {noKamar && rencanaMasuk && (
          <p className="flex items-center gap-2 rounded-md border border-line bg-raised p-4 t-body-sm">
            <CheckCircle2 size={18} className="shrink-0 text-success" aria-hidden />
            Kamar {noKamar} · masuk {rencanaMasuk}
          </p>
        )}

        <Seksi judul="Data Diri">
          <Teks nama="nama_lengkap" label="Nama lengkap" wajib autoComplete="name" />
          <Teks nama="nama_panggilan" label="Nama panggilan" />
          <Teks nama="email" label="Email" wajib tipe="email" autoComplete="email" />
          <Teks
            nama="no_hp"
            label="Nomor HP"
            wajib
            tipe="tel"
            inputMode="tel"
            placeholder="628xxxxxxxxxx"
            bantuan="Boleh ditulis 08xx, otomatis disimpan sebagai 62xx."
          />
          <Teks nama="asal_daerah" label="Asal daerah" />

          <div>
            <label htmlFor="pekerjaan" className="t-label mb-2 block">
              Pekerjaan
            </label>
            <select
              id="pekerjaan"
              name="pekerjaan"
              required
              value={pekerjaan}
              onChange={(e) => setPekerjaan(e.target.value)}
              className="min-h-12 w-full rounded-md border border-line bg-raised px-4 t-body focus:border-action"
            >
              <option value="Mahasiswi">Mahasiswi</option>
              <option value="Karyawati">Karyawati</option>
            </select>
          </div>

          <Teks
            nama="program_studi"
            label="Program studi"
            wajib={pekerjaan === "Mahasiswi"}
            placeholder={pekerjaan === "Mahasiswi" ? "" : "-"}
            bantuan={pekerjaan === "Mahasiswi" ? undefined : "Isi tanda - kalau bukan mahasiswi."}
          />
          <Teks
            nama="institusi"
            label="Institusi"
            wajib
            bantuan="Nama kampus atau perusahaan tempat bekerja."
          />
        </Seksi>

        <Seksi judul="Kontak Darurat 1">
          <Teks nama="darurat1_nama" label="Nama" wajib />
          <Teks nama="darurat1_nomor" label="Nomor HP" wajib tipe="tel" inputMode="tel" />
          <Teks nama="darurat1_relasi" label="Relasi" wajib placeholder="Ibu, Ayah, Kakak…" />
        </Seksi>

        <Seksi judul="Kontak Darurat 2">
          <Teks nama="darurat2_nama" label="Nama" />
          <Teks nama="darurat2_nomor" label="Nomor HP" tipe="tel" inputMode="tel" />
          <Teks nama="darurat2_relasi" label="Relasi" />
        </Seksi>

        <Seksi judul="Barang Bawaan">
          <div>
            <label htmlFor="jumlah_gadget" className="t-label mb-2 block">
              Jumlah total gadget
            </label>
            <select
              id="jumlah_gadget"
              name="jumlah_gadget"
              required
              defaultValue="1"
              className="min-h-12 w-full rounded-md border border-line bg-raised px-4 t-body focus:border-action"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="barang_elektronik" className="t-label mb-2 block">
              Barang elektronik tambahan <span className="text-fg-secondary">(opsional)</span>
            </label>
            <textarea
              id="barang_elektronik"
              name="barang_elektronik"
              rows={3}
              maxLength={500}
              placeholder="Selain kipas angin, HP, laptop, tablet/iPad, rice cooker."
              className="w-full rounded-md border border-line bg-raised p-4 t-body focus:border-action"
            />
          </div>
        </Seksi>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setLangkah(0)}
            className="btn-anim min-h-12 flex-1 rounded-md border border-line px-6 t-label text-fg"
          >
            Kembali
          </button>
          <div className="flex-[2]">
            <TombolLangkah label="Lanjut ke Dokumen" onClick={lanjutKeDokumen} />
          </div>
        </div>
      </div>

      <div className={langkah === 2 ? "flex flex-col gap-5" : "hidden"}>
        <Seksi judul="Dokumen">
          <div>
            <label htmlFor="scan_identitas" className="t-label mb-2 block">
              Scan identitas (KTP/KTM)
            </label>
            <input
              id="scan_identitas"
              name="scan_identitas"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="w-full rounded-md border border-line bg-raised p-3 t-body-sm"
            />
          </div>
          <div>
            <label htmlFor="scan_bukti_dp" className="t-label mb-2 block">
              Scan bukti pembayaran DP
            </label>
            <input
              id="scan_bukti_dp"
              name="scan_bukti_dp"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="w-full rounded-md border border-line bg-raised p-3 t-body-sm"
            />
            <p className="t-caption mt-1 text-fg-secondary">JPG, PNG, WebP, atau PDF. Maksimal 5 MB.</p>
          </div>
        </Seksi>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setLangkah(1)}
            className="btn-anim min-h-12 flex-1 rounded-md border border-line px-6 t-label text-fg"
          >
            Kembali
          </button>
          <div className="flex-[2]">
            <SubmitButton />
          </div>
        </div>
      </div>
    </form>
  );
}
