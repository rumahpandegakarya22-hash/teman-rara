import { Sparkles } from "lucide-react";

/** Penanda konten diperbarui dalam 7 hari terakhir. Warna + ikon + teks (color-independence). */
export default function BadgeBaru() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 t-caption font-semibold text-red-600">
      <Sparkles size={12} aria-hidden />
      Baru
    </span>
  );
}
