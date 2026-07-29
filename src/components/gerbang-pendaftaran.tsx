"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WelcomeScreen } from "@/components/ui/welcome-screen";

/**
 * Layar sambutan yang muncul setelah menu "Penghuni Baru" dan sebelum formulir
 * pendaftaran tampil. Overlay-nya menutupi satu layar penuh; setelah ditutup
 * formulir di bawahnya langsung bisa diisi.
 */
export default function GerbangPendaftaran({ children }: { children: React.ReactNode }) {
  const [tampil, setTampil] = useState(true);

  return (
    <>
      <AnimatePresence>
        {tampil && (
          <motion.div
            key="sambutan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label="Selamat datang"
            className="fixed inset-0 z-50 overflow-y-auto bg-surface"
          >
            <WelcomeScreen
              imageUrl="/bg/beranda.jpg"
              title={
                <>
                  Selamat datang di <span className="text-action">Kost Tiga Dara</span>
                </>
              }
              description="Isi formulir pendaftaran untuk mengajukan kamar. Tanpa perlu membuat akun — pengelola akan menghubungi kamu untuk verifikasi sebelum check-in."
              buttonText="Mulai Isi Formulir"
              onButtonClick={() => setTampil(false)}
              secondaryActionText="Lihat dulu tanpa mengisi"
              onSecondaryActionClick={() => setTampil(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </>
  );
}
