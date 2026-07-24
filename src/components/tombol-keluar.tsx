"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export default function TombolKeluar() {
  const { signOut } = useClerk();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [proses, setProses] = useState(false);

  return (
    <>
      <button
        onClick={() => setKonfirmasi(true)}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-fg px-6 t-label"
      >
        <LogOut size={20} aria-hidden />
        Keluar
      </button>

      {konfirmasi && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-keluar"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-raised p-6 elev-3">
            <h2 id="judul-keluar" className="t-h3">
              Keluar dari akun?
            </h2>
            <p className="t-body-sm mt-2 text-fg-secondary">
              Kamu perlu masuk lagi untuk melihat info kamar dan pengaduan.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setKonfirmasi(false)}
                className="min-h-12 flex-1 rounded-md border border-fg px-4 t-label"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setProses(true);
                  signOut({ redirectUrl: "/" });
                }}
                disabled={proses}
                className="min-h-12 flex-1 rounded-md bg-red-700 px-4 t-label text-on-action disabled:opacity-60"
              >
                {proses ? "Keluar…" : "Ya, Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
