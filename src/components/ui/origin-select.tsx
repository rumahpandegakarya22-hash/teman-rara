"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Dropdown bergaya OriginUI (21st.dev @originui) sebagai pengganti `<select>`
 * native, yang popup-nya tidak bisa dianimasikan.
 *
 * Geometri sumber disalin: panel `rounded-lg` + `min-w-40` + `p-1` + border 1px
 * + `shadow-lg shadow-black/5`; item `rounded-md px-2 py-1.5 text-sm gap-2`
 * dengan indikator centang `h-3.5 w-3.5` di `left-2` (jadi item `pl-8`).
 * Animasi masuk/keluar: fade + zoom-95 + slide-from-top-2, 150ms.
 *
 * Warnanya memakai token proyek, bukan `bg-popover`/`bg-accent` milik shadcn,
 * supaya benar di tema terang maupun gelap.
 */

export interface OpsiSelect {
  value: string;
  label: string;
  disabled?: boolean;
}

export function OriginSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Pilih…",
  required,
  disabled,
  ariaLabel,
  className = "",
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  options: OpsiSelect[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const terpilih = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={wrap}>
      {/* Nilai tetap ikut FormData / Server Action tanpa mengubah handler. */}
      {name && <input type="hidden" name={name} value={value} required={required} />}

      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-md border border-line bg-raised px-4 text-left t-body focus:border-action disabled:opacity-55 ${className}`}
      >
        <span className={terpilih ? "truncate" : "truncate text-fg-secondary"}>
          {terpilih ? terpilih.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className={`shrink-0 text-fg-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformOrigin: "top" }}
            className="absolute left-0 top-full z-50 mt-1 max-h-72 w-full min-w-40 overflow-auto rounded-lg border border-line bg-raised p-1 shadow-[var(--elev-3)]"
          >
            {options.map((o) => {
              const aktif = o.value === value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={aktif}
                    disabled={o.disabled}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`relative flex w-full select-none items-center gap-2 rounded-md py-1.5 pl-8 pr-2 text-left t-body-sm outline-none transition-colors hover:bg-sunken focus-visible:bg-sunken disabled:pointer-events-none disabled:opacity-50 ${
                      aktif ? "bg-sunken text-fg" : "text-fg"
                    }`}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {aktif && <Check size={16} aria-hidden />}
                    </span>
                    {o.label}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
