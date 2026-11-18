import RatingInput from "@/components/rating-input";
import { RATING_FASILITAS, RATING_PELAYANAN, SKALA } from "@/lib/exit-survey";

function Seksi({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5 rounded-lg border border-line bg-raised/60 p-5">
      <legend className="t-h3 px-1">{judul}</legend>
      {children}
    </fieldset>
  );
}

function Teks({ nama, label, bantuan }: { nama: string; label: string; bantuan?: string }) {
  return (
    <div>
      <label htmlFor={nama} className="t-label mb-2 block">
        {label}
      </label>
      <textarea
        id={nama}
        name={nama}
        rows={3}
        maxLength={1000}
        className="w-full rounded-md border border-line bg-raised p-4 t-body focus:border-action"
      />
      {bantuan && <p className="t-caption mt-1 text-fg-secondary">{bantuan}</p>}
    </div>
  );
}

function YaTidak({ nama, label }: { nama: string; label: string }) {
  return (
    <fieldset>
      <legend className="t-label mb-2">{label}</legend>
      <div className="flex gap-4 t-body-sm">
        <label className="flex min-h-12 items-center gap-2">
          <input type="radio" name={nama} value="1" className="size-5" /> Ya
        </label>
        <label className="flex min-h-12 items-center gap-2">
          <input type="radio" name={nama} value="0" className="size-5" /> Tidak
        </label>
      </div>
    </fieldset>
  );
}

/** Semua pertanyaan opsional sebagai satu paket: kosong semua = dilewati, terisi sebagian = ditolak server. */
export default function ExitSurveyFields() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="t-h3">
          Exit survey <span className="t-body-sm text-fg-secondary">(opsional)</span>
        </h2>
        <p className="t-body-sm mt-1 text-fg-secondary">
          Mohon isi dengan jujur. Kalau diisi, lengkapi semua pertanyaan; tulis &quot;-&quot; bila tidak ada masukan.
        </p>
        <p className="t-caption mt-1 text-fg-secondary">Skala: {SKALA}</p>
      </div>

      <Seksi judul="Penilaian Fasilitas Kost">
        {RATING_FASILITAS.map((r) => (
          <RatingInput key={r.nama} nama={r.nama} label={r.label} />
        ))}
        <Teks
          nama="masukan_fasilitas"
          label="Masukan untuk fasilitas umum"
          bantuan='Saran/kritik terhadap fasilitas umum. Tulis "-" bila tidak ada.'
        />
      </Seksi>

      <Seksi judul="Kualitas Pelayanan">
        {RATING_PELAYANAN.map((r) => (
          <RatingInput key={r.nama} nama={r.nama} label={r.label} />
        ))}
        <Teks
          nama="masukan_pengelola"
          label="Masukan untuk pengelola kost"
          bantuan='Saran/kritik terkait pengelolaan atau peraturan kost. Tulis "-" bila tidak ada.'
        />
      </Seksi>

      <Seksi judul="Kepuasan Penghuni">
        <YaTidak nama="puas" label="Secara keseluruhan, saya merasa puas tinggal di kost ini" />
        <YaTidak nama="rekomendasi" label="Saya akan merekomendasikan kost ini kepada orang lain" />
        <Teks nama="disukai" label="Apa hal yang kamu suka dari kost ini?" />
        <Teks nama="tidak_disukai" label="Apa hal yang kamu tidak suka dari kost ini?" />
      </Seksi>
    </div>
  );
}
