"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Port FlowButton (21st.dev @xubohuah). Mekanika animasinya dipertahankan persis
 * — durasi, easing, panah masuk-keluar, lingkaran yang memuai, radius yang
 * berubah saat hover — hanya warnanya dipetakan ke token desain proyek supaya
 * tetap benar di tema terang/gelap.
 *
 * `className` pemanggil dipakai apa adanya untuk ukuran/warna/radius dasar;
 * komponen ini hanya menambahkan lapisan animasi di atasnya.
 *
 * `arrows`: tombol yang sudah punya ikon sendiri memakai "right" supaya panah
 * kiri tidak menimpa ikon itu.
 */

export type FlowArrows = "both" | "right" | "none";

const BASE =
  "group relative flex items-center justify-center gap-1 overflow-hidden cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:rounded-[12px] active:scale-[0.95]";

const ARROW =
  "absolute w-4 h-4 fill-none z-[9] transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]";

function Lapisan({
  arrows,
  ripple,
  children,
}: {
  arrows: FlowArrows;
  ripple: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {arrows === "both" && (
        <ArrowRight aria-hidden className={`${ARROW} left-[-25%] group-hover:left-4`} />
      )}
      <span className="relative z-[1] flex items-center gap-2 -translate-x-3 group-hover:translate-x-3 transition-all duration-[800ms] ease-out">
        {children}
      </span>
      <span
        aria-hidden
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-[50%] opacity-0 group-hover:w-[220px] group-hover:h-[220px] group-hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${ripple}`}
      />
      {arrows !== "none" && (
        <ArrowRight aria-hidden className={`${ARROW} right-4 group-hover:right-[-25%]`} />
      )}
    </>
  );
}

export function FlowButton({
  text,
  children,
  className = "",
  arrows = "both",
  /* Warna riak yang memuai. Default cocok untuk tombol bg-action; tombol
     bergaris/berlatar lain mengoper warnanya sendiri agar teks tetap terbaca. */
  rippleClassName = "bg-action-pressed",
  ...rest
}: {
  text?: string;
  children?: React.ReactNode;
  arrows?: FlowArrows;
  rippleClassName?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`${BASE} ${className}`}>
      <Lapisan arrows={arrows} ripple={rippleClassName}>
        {children ?? text}
      </Lapisan>
    </button>
  );
}

export function FlowLink({
  children,
  className = "",
  arrows = "both",
  rippleClassName = "bg-action-pressed",
  href,
  ...rest
}: React.ComponentProps<typeof Link> & { arrows?: FlowArrows; rippleClassName?: string }) {
  return (
    <Link href={href} {...rest} className={`${BASE} ${className}`}>
      <Lapisan arrows={arrows} ripple={rippleClassName}>
        {children}
      </Lapisan>
    </Link>
  );
}
