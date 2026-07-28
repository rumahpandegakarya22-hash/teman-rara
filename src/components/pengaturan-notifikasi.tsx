"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { simpanPreferensi } from "@/app/profil/actions";

type Preferensi = { push: boolean; email: boolean; in_app: boolean };

const JENIS: { kunci: keyof Preferensi; label: string; keterangan: string }[] = [
  { kunci: "push", label: "Notifikasi Push", keterangan: "Kabar langsung di layar ponsel." },
  { kunci: "email", label: "Notifikasi Email", keterangan: "Ringkasan dikirim ke alamat email." },
  { kunci: "in_app", label: "Notifikasi Dalam Aplikasi", keterangan: "Penanda saat membuka aplikasi." },
];

export default function PengaturanNotifikasi({ awal }: { awal: Preferensi }) {
  const [nilai, setNilai] = useState(awal);
  const [, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);

  const ubah = (kunci: keyof Preferensi, aktif: boolean) => {
    const sebelum = nilai[kunci];
    setNilai((v) => ({ ...v, [kunci]: aktif }));
    setGalat(null);

    mulai(async () => {
      const hasil = await simpanPreferensi(kunci, aktif);
      if (!hasil.ok) {
        // Kembalikan tampilan ke nilai sebelumnya supaya tidak menipu pengguna.
        setNilai((v) => ({ ...v, [kunci]: sebelum }));
        setGalat(hasil.error);
      }
    });
  };

  return (
    <div>
      {galat && (
        <p role="alert" className="mb-3 rounded-md bg-red-100 p-3 t-body-sm text-red-600">
          {galat}
        </p>
      )}
      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-raised">
        {JENIS.map(({ kunci, label, keterangan }) => (
          <li key={kunci} className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="t-body font-medium">{label}</p>
              <p className="t-caption text-fg-secondary">{keterangan}</p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={nilai[kunci]}
                onChange={(e) => ubah(kunci, e.target.checked)}
                className="peer sr-only"
                aria-label={label}
              />
              {/* Item 5 — bouncy-toggle (micro): knob memakai spring, bukan easing linear. */}
              <span
                className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-action ${
                  nilai[kunci] ? "bg-action" : "bg-sunken"
                }`}
              >
                <motion.span
                  className="size-5 rounded-full bg-raised shadow"
                  animate={{ x: nilai[kunci] ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 700, damping: 22 }}
                />
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
