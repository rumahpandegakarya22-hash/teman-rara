"use client";

import { motion } from "motion/react";

/**
 * Port ProgressIndicator (21st.dev @anurag-mishra22): titik-titik langkah dengan
 * "pil" hijau yang memuai mengikuti langkah aktif. Nilai animasinya (spring
 * stiffness/damping/mass/bounce, lebar per langkah) disalin apa adanya.
 *
 * Lebar pil di sumber: 24px / 60px / 96px untuk langkah 1/2/3 — beda 36px per
 * langkah, jadi digeneralisasi supaya jumlah langkah bebas.
 */
export function ProgressIndicator({
  steps,
  currentIndex,
  label = "Langkah pendaftaran",
}: {
  steps: string[];
  currentIndex: number;
  label?: string;
}) {
  const lebarPil = `${24 + currentIndex * 36}px`;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={currentIndex + 1}
      aria-valuetext={steps[currentIndex]}
      className="mb-6 flex flex-col items-center justify-center gap-8"
    >
      <div className="relative flex items-center gap-6">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`relative z-10 h-2 w-2 rounded-full ${i <= currentIndex ? "bg-white" : "bg-gray-300"}`}
          />
        ))}
        <motion.div
          initial={{ width: "12px", height: "24px", x: 0 }}
          animate={{ width: lebarPil, x: 0 }}
          className="absolute -left-[8px] -top-[8px] h-3 -translate-y-1/2 rounded-full bg-green-500"
          transition={{ type: "spring", stiffness: 300, damping: 20, mass: 0.8, bounce: 0.25, duration: 0.6 }}
        />
      </div>
    </div>
  );
}
