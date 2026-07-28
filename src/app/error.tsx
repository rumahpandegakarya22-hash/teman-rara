"use client";

import { AlertCircle } from "lucide-react";

/**
 * Tanpa berkas ini, error di satu halaman membuat Next mengganti seluruh
 * dokumen sehingga tab bar ikut hilang dan layar terlihat kosong.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-sunken">
        <AlertCircle size={24} className="text-action" aria-hidden />
      </span>
      <h1 className="t-h1">Ada yang bermasalah</h1>
      <p className="t-body max-w-[40ch] text-fg-secondary">
        Halaman ini gagal dimuat. Coba lagi, atau hubungi pengelola kalau terus berulang.
      </p>
      <button
        onClick={reset}
        className="btn-anim mt-2 min-h-12 rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed"
      >
        Coba Lagi
      </button>
    </main>
  );
}
