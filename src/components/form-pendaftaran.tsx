"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cekKetersediaan, kirimPendaftaran, type KamarOpsi, type PendaftaranState } from "@/app/pendaftaran/actions";
import { FileUploadCard } from "@/components/ui/file-upload-card";
import { FlowButton } from "@/components/ui/flow-button";
import { GlassDateField } from "@/components/ui/glass-calendar";
import { OriginSelect } from "@/components/ui/origin-select";
import { ProgressIndicator } from "@/components/ui/progress-indicator";

const LANGKAH = ["Ketersediaan", "Biodata", "Dokumen"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <FlowButton
      type="submit"
      disabled={pending}
      className="btn-anim min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed disabled:bg-sunken disabled:text-fg-disabled"
    >
      {pending ? "Mengirim…" : "Kirim Pendaftaran"}
    </FlowButton>
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
    <FlowButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-anim min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed disabled:bg-sunken disabled:text-fg-disabled"
    >
      {label}
    </FlowButton>
  );
}

export default function FormPendaftaran({ tipeKamar }: { tipeKamar: string[] }) {
  const [state, action] = useActionState<PendaftaranState, FormData>(kirimPendaftaran, {});
  const formRef = useRef<HTMLFormElement>(null);
  const biodataRef = useRef<HTMLDivElement>(null);
  const [pekerjaan, setPekerjaan] = useState("Mahasiswi");
  // Dulu uncontrolled (`defaultValue="1"`); OriginSelect controlled, jadi
  // nilainya dipegang state dengan default yang sama.
  const [jumlahGadget, setJumlahGadget] = useState("1");

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
    // `form.reportValidity()` memvalidasi SELURUH form — termasuk input dokumen
    // milik langkah 3 yang belum diisi. `display:none` tidak membebaskan elemen
    // dari constraint validation, jadi pemeriksaan itu selalu gagal dan tombol
    // ini tidak pernah bisa maju. Karena itu validasinya dibatasi ke kontrol di
    // dalam langkah Biodata saja.
    const kontrol = Array.from(
      biodataRef.current?.querySelectorAll('input, select, textarea') ?? [],
    ) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];
    for (const el of kontrol) {
      if (!el.checkValidity()) {
        el.reportValidity();
        return;
      }
    }
    setLangkah(2);
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-6">
      <ProgressIndicator steps={LANGKAH} currentIndex={langkah} />

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
            <GlassDateField
              id="tanggal_cek"
              value={rencanaMasuk}
              onChange={(v) => {
                setRencanaMasuk(v);
                setSudahCek(false);
              }}
            />
          </div>

          <div>
            <label htmlFor="tipe_cek" className="t-label mb-2 block">
              Tipe kamar
            </label>
            <OriginSelect
              id="tipe_cek"
              ariaLabel="Tipe kamar"
              value={tipeDipilih}
              onChange={(v) => {
                setTipeDipilih(v);
                setSudahCek(false);
              }}
              options={tipeKamar.map((t) => ({ value: t, label: t }))}
            />
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

      <div ref={biodataRef} className={langkah === 1 ? "flex flex-col gap-5" : "hidden"}>
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
            <OriginSelect
              id="pekerjaan"
              name="pekerjaan"
              ariaLabel="Pekerjaan"
              required
              value={pekerjaan}
              onChange={setPekerjaan}
              options={[
                { value: "Mahasiswi", label: "Mahasiswi" },
                { value: "Karyawati", label: "Karyawati" },
              ]}
            />
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
            <OriginSelect
              id="jumlah_gadget"
              name="jumlah_gadget"
              ariaLabel="Jumlah total gadget"
              required
              value={jumlahGadget}
              onChange={setJumlahGadget}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
            />
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
            <FileUploadCard
              id="scan_identitas"
              name="scan_identitas"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              judul="Scan identitas"
              deskripsi="KTP atau KTM yang masih berlaku"
              petunjuk="JPG, PNG, WebP, atau PDF. Maksimal 5 MB."
            />
          </div>
          <div>
            <label htmlFor="scan_bukti_dp" className="t-label mb-2 block">
              Scan bukti pembayaran DP
            </label>
            <FileUploadCard
              id="scan_bukti_dp"
              name="scan_bukti_dp"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              judul="Scan bukti pembayaran DP"
              deskripsi="Bukti transfer uang muka"
              petunjuk="JPG, PNG, WebP, atau PDF. Maksimal 5 MB."
            />
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
