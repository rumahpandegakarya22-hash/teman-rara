/** Pilihan 1-5 memakai radio native (ikut FormData, bisa diakses keyboard). */
export default function RatingInput({
  nama,
  label,
  wajib,
}: {
  nama: string;
  label: string;
  wajib?: boolean;
}) {
  return (
    <fieldset>
      <legend className="t-label mb-2">{label}</legend>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="relative">
            <input type="radio" name={nama} value={n} required={wajib} className="peer sr-only" />
            <span className="btn-anim flex min-h-12 items-center justify-center rounded-md border border-line bg-raised t-body-sm peer-checked:border-action peer-checked:bg-action peer-checked:text-on-action peer-focus-visible:outline peer-focus-visible:outline-2">
              {n}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
