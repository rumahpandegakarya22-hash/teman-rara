"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

/**
 * Item 4.3 — progress stepper: lingkaran bernomor + garis penghubung, langkah
 * yang sudah lewat dicentang, langkah aktif ditonjolkan. Posisi garis/lingkaran
 * dihitung persentase supaya tetap presisi berapa pun jumlah langkahnya.
 */
export function Stepper({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  const n = steps.length;
  const inset = 100 / n / 2;
  const progress = n > 1 ? currentIndex / (n - 1) : 0;

  return (
    <ol aria-label="Langkah pendaftaran" className="relative mb-6">
      <div className="absolute top-4 h-0.5 bg-line" style={{ left: `${inset}%`, right: `${inset}%` }}>
        <motion.div
          className="h-full bg-action"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
        />
      </div>
      <div className="relative flex justify-between">
        {steps.map((label, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={label} className="flex flex-col items-center gap-2" style={{ width: `${100 / n}%` }}>
              <motion.span
                initial={false}
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
                className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 t-label ${
                  done || active
                    ? "border-action bg-action text-on-action"
                    : "border-line bg-raised text-fg-secondary"
                }`}
              >
                {done ? <Check size={16} aria-hidden /> : i + 1}
              </motion.span>
              <span
                className={`t-caption max-w-[10ch] text-center ${
                  active ? "font-semibold text-fg" : "text-fg-secondary"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </div>
    </ol>
  );
}
