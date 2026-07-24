"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { formatRupiah, formatTanggal } from "@/lib/format";

type Tarif = {
  harga_3bulan: number | null;
  harga_6bulan: number | null;
  harga_9bulan: number | null;
  harga_tahun: number | null;
};

/** Listrik tambahan hanya berlaku untuk kamar tipe Eco. */
function pakaiListrik(tipeKamar: string | null) {
  return (tipeKamar ?? "").trim().toLowerCase() === "eco";
}

/**
 * Kalkulator perkiraan biaya sewa berikutnya.
 *
 * Nilai di kolom `harga_3bulan`, `harga_6bulan`, dst adalah TOTAL untuk durasi
 * tersebut, bukan tarif per bulan — jadi dipakai apa adanya. Minimal sewa 3
 * bulan. Periode awal mengikuti periode akhir tagihan terakhir.
 */
export default function KalkulatorSewa({
  tarif,
  tipeKamar,
  listrikPerBulan,
  mulaiDari,
}: {
  tarif: Tarif;
  tipeKamar: string | null;
  listrikPerBulan: number;
  mulaiDari: string | null;
}) {
  const opsi = [
    { bulan: 3, total: tarif.harga_3bulan },
    { bulan: 6, total: tarif.harga_6bulan },
    { bulan: 9, total: tarif.harga_9bulan },
    { bulan: 12, total: tarif.harga_tahun },
  ].filter((o): o is { bulan: number; total: number } => typeof o.total === "number" && o.total > 0);

  const eco = pakaiListrik(tipeKamar);
  const [bulan, setBulan] = useState(opsi[0]?.bulan ?? 3);
  const [listrik, setListrik] = useState(listrikPerBulan);

  if (opsi.length === 0) return null;

  const dipilih = opsi.find((o) => o.bulan === bulan) ?? opsi[0];
  const totalListrik = eco ? Math.max(listrik, 0) * dipilih.bulan : 0;
  const grandTotal = dipilih.total + totalListrik;

  const awal = mulaiDari ? new Date(mulaiDari) : null;
  const akhir = awal ? new Date(awal) : null;
  if (akhir) akhir.setMonth(akhir.getMonth() + dipilih.bulan);

  return (
    <section className="rounded-lg border border-line bg-raised p-5 elev-1">
      <h2 className="t-h3 mb-1 flex items-center gap-2">
        <Calculator size={20} className="text-action" aria-hidden />
        Kalkulator Sewa
      </h2>
      <p className="t-body-sm mb-4 text-fg-secondary">
        Perkiraan biaya perpanjangan. Angka final tetap mengikuti invoice dari pengelola.
      </p>

      <fieldset className="mb-4">
        <legend className="t-label mb-2">Durasi sewa</legend>
        <div className="flex flex-wrap gap-2">
          {opsi.map((o) => (
            <button
              key={o.bulan}
              type="button"
              onClick={() => setBulan(o.bulan)}
              aria-pressed={bulan === o.bulan}
              className={`min-h-12 rounded-full border px-4 t-label ${
                bulan === o.bulan
                  ? "border-action bg-action text-on-action"
                  : "border-line bg-surface text-fg-secondary"
              }`}
            >
              {o.bulan} bulan
            </button>
          ))}
        </div>
      </fieldset>

      {eco && (
        <div className="mb-4">
          <label htmlFor="listrik" className="t-label mb-2 block">
            Listrik tambahan per bulan
          </label>
          <input
            id="listrik"
            type="number"
            min={0}
            step={10000}
            value={listrik}
            onChange={(e) => setListrik(Number(e.target.value))}
            className="min-h-12 w-full rounded-md border border-line bg-surface px-4 t-body tabular-nums focus:border-action"
          />
          <p className="t-caption mt-1 text-fg-secondary">
            Khusus kamar tipe Eco. Terisi dari tagihan terakhir, boleh diubah.
          </p>
        </div>
      )}

      <dl className="flex flex-col gap-2 border-t border-line pt-4">
        {awal && akhir && (
          <div className="flex items-center justify-between gap-3">
            <dt className="t-body-sm text-fg-secondary">Periode</dt>
            <dd className="t-body-sm text-right">
              {formatTanggal(awal.toISOString())} sampai {formatTanggal(akhir.toISOString())}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="t-body-sm text-fg-secondary">Sewa {dipilih.bulan} bulan</dt>
          <dd className="t-body-sm tabular-nums">{formatRupiah(dipilih.total)}</dd>
        </div>
        {totalListrik > 0 && (
          <div className="flex items-center justify-between gap-3">
            <dt className="t-body-sm text-fg-secondary">Listrik {dipilih.bulan} bulan</dt>
            <dd className="t-body-sm tabular-nums">{formatRupiah(totalListrik)}</dd>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-line pt-2">
          <dt className="t-body font-semibold">Perkiraan total</dt>
          <dd className="t-h3 tabular-nums">{formatRupiah(grandTotal)}</dd>
        </div>
      </dl>
    </section>
  );
}
