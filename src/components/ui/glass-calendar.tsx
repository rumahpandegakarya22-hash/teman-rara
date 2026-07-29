"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Port GlassCalendar (21st.dev @ravikatiyar162).
 *
 * Catatan penting: komponen aslinya adalah STRIP MINGGUAN horizontal, bukan date
 * picker. Karena di sini dipakai untuk mengganti `<input type="date">`, grid
 * bulanan ditambahkan. Semua bahasa visualnya disalin apa adanya — panel kaca
 * (bg-black/20 + backdrop-blur-xl + border-white/10, rounded-3xl, shadow-2xl),
 * judul bulan ber-animasi fade+slide, pil tanggal terpilih bergradien
 * pink→orange, titik penanda "hari ini", garis pemisah, dan tombol nav bulat.
 */

const HARI = ["M", "S", "S", "R", "K", "J", "S"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// "2026-07-29" -> Date lokal. `new Date(str)` memperlakukannya sebagai UTC,
// yang bisa menggeser tanggal satu hari di zona waktu Indonesia.
function dariIso(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function GlassCalendar({
  selectedDate,
  onDateSelect,
  className = "",
}: {
  selectedDate?: Date;
  onDateSelect?: (d: Date) => void;
  className?: string;
}) {
  const [bulanTampil, setBulanTampil] = useState(selectedDate ?? new Date());
  const [terpilih, setTerpilih] = useState<Date | undefined>(selectedDate);
  const hariIni = new Date();

  const awal = new Date(bulanTampil.getFullYear(), bulanTampil.getMonth(), 1);
  const jumlahHari = new Date(bulanTampil.getFullYear(), bulanTampil.getMonth() + 1, 0).getDate();
  const kosongDepan = awal.getDay();

  const pilih = (d: Date) => {
    setTerpilih(d);
    onDateSelect?.(d);
  };

  const judul = `${BULAN[bulanTampil.getMonth()]} ${bulanTampil.getFullYear()}`;

  return (
    <div
      className={`w-full max-w-[360px] overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-5 text-white shadow-2xl backdrop-blur-xl ${className}`}
    >
      <div className="my-1 flex items-center justify-between">
        <motion.p
          key={judul}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-bold tracking-tight"
        >
          {judul}
        </motion.p>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            onClick={() => setBulanTampil(new Date(bulanTampil.getFullYear(), bulanTampil.getMonth() - 1, 1))}
            className="rounded-full p-1 text-white/70 transition-colors hover:bg-black/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            onClick={() => setBulanTampil(new Date(bulanTampil.getFullYear(), bulanTampil.getMonth() + 1, 1))}
            className="rounded-full p-1 text-white/70 transition-colors hover:bg-black/20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {HARI.map((h, i) => (
          <span key={i} className="pb-1 text-center text-xs font-bold text-white/50">
            {h}
          </span>
        ))}
        {Array.from({ length: kosongDepan }, (_, i) => (
          <span key={`k${i}`} />
        ))}
        {Array.from({ length: jumlahHari }, (_, i) => {
          const d = new Date(bulanTampil.getFullYear(), bulanTampil.getMonth(), i + 1);
          const isSelected = terpilih ? sameDay(d, terpilih) : false;
          const isToday = sameDay(d, hariIni);
          return (
            <button
              key={i}
              type="button"
              onClick={() => pilih(d)}
              aria-pressed={isSelected}
              className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 ${
                isSelected
                  ? "bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg"
                  : "text-white hover:bg-white/20"
              }`}
            >
              {isToday && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pink-400" />
              )}
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-5 h-px bg-white/20" />

      <div className="mt-4 flex items-center justify-between space-x-4">
        <button
          type="button"
          onClick={() => {
            setBulanTampil(new Date());
            pilih(new Date());
          }}
          className="flex items-center space-x-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
        >
          <CalendarDays className="h-4 w-4" />
          <span>Hari ini</span>
        </button>
        <span className="text-xs font-bold text-white/60">
          {terpilih ? iso(terpilih) : "Belum dipilih"}
        </span>
      </div>
    </div>
  );
}

/**
 * Pembungkus siap-pakai: tampil seperti field biasa, membuka GlassCalendar saat
 * diklik, dan tetap mengirim nilai lewat `<input type="hidden">` supaya
 * FormData/Server Action tidak perlu diubah.
 */
export function GlassDateField({
  id,
  name,
  value,
  onChange,
  required,
  className = "",
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const dipilih = dariIso(value) ?? undefined;

  return (
    <div ref={wrapRef} className="relative">
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex min-h-12 w-full items-center justify-between rounded-md border border-line bg-raised px-4 t-body focus:border-action ${className}`}
      >
        <span className={value ? "" : "text-fg-secondary"}>{value || "Pilih tanggal"}</span>
        <CalendarDays size={18} className="shrink-0 text-fg-secondary" aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            role="dialog"
            aria-label="Pilih tanggal"
            className="absolute left-0 top-full z-50 mt-2 w-full"
          >
            <div className="rounded-3xl bg-neutral-900/60">
              <GlassCalendar
                selectedDate={dipilih}
                onDateSelect={(d) => {
                  onChange(iso(d));
                  setOpen(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
