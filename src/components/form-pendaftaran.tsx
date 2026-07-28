"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { kirimPendaftaran, type PendaftaranState } from "@/app/pendaftaran/actions";

type Kamar = { no_kamar: number; tipe_kamar: string | null };

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

export default function FormPendaftaran({ kamarTersedia }: { kamarTersedia: Kamar[] }) {
  const [state, action] = useActionState<PendaftaranState, FormData>(kirimPendaftaran, {});
  const [pekerjaan, setPekerjaan] = useState("Mahasiswi");

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-red-100 p-4 t-body-sm text-red-600">
          <AlertCircle size={20} className="shrink-0" aria-hidden />
          {state.error}
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

      <Seksi judul="Kamar">
        <div>
          <label htmlFor="no_kamar" className="t-label mb-2 block">
            Nomor kamar
          </label>
          <select
            id="no_kamar"
            name="no_kamar"
            required
            defaultValue=""
            className="min-h-12 w-full rounded-md border border-line bg-raised px-4 t-body focus:border-action"
          >
            <option value="" disabled>
              Pilih kamar…
            </option>
            {kamarTersedia.map((k) => (
              <option key={k.no_kamar} value={k.no_kamar}>
                Kamar {k.no_kamar}
                {k.tipe_kamar ? ` — ${k.tipe_kamar}` : ""}
              </option>
            ))}
          </select>
          <p className="t-caption mt-1 text-fg-secondary">Hanya kamar kosong yang muncul.</p>
        </div>
        <Teks nama="rencana_masuk" label="Rencana tanggal masuk" wajib tipe="date" />
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

      <SubmitButton />
    </form>
  );
}
