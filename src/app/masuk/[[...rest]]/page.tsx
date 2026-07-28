"use client";

import { motion } from "motion/react";
import { SignIn } from "@clerk/nextjs";

/** Item 4 — animated-sign-in: gradient bergerak halus (palet sendiri) + kartu masuk dari bawah. */
export default function MasukPage() {
  return (
    <main className="masuk-gradient relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="mb-8 text-center"
      >
        <p className="t-h1 mt-1 text-fg-inverse">Kost Tiga Dara</p>
        <h1 className="t-display text-fg-inverse">Masuk</h1>
        <p className="t-body-sm mt-2 text-fg-inverse/80">Masuk untuk melihat detail kamar.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.2, 0, 0, 1] }}
      >
        <SignIn signUpUrl="/daftar" fallbackRedirectUrl="/kamar" />
      </motion.div>
    </main>
  );
}
