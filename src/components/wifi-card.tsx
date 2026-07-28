"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Eye, EyeOff, Wifi } from "lucide-react";

export default function WifiCard({ ssid, password }: { ssid: string; password: string }) {
  const [tampil, setTampil] = useState(false);
  const [disalin, setDisalin] = useState<string | null>(null);

  const salin = async (nilai: string, label: string) => {
    try {
      await navigator.clipboard.writeText(nilai);
      setDisalin(label);
      setTimeout(() => setDisalin(null), 2000);
    } catch {
      /* clipboard ditolak — pengguna masih bisa menyalin manual */
    }
  };

  return (
    <section className="rounded-lg border border-line bg-raised p-5 elev-1">
      <h2 className="t-h3 mb-4 flex items-center gap-2">
        <Wifi size={20} className="text-action" aria-hidden />
        WiFi Kamar
      </h2>

      <dl className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <dt className="t-caption text-fg-secondary">Nama jaringan</dt>
            <dd className="t-body truncate font-medium">{ssid}</dd>
          </div>
          <button
            onClick={() => salin(ssid, "user")}
            aria-label="Salin nama jaringan WiFi"
            className="btn-anim flex size-12 shrink-0 items-center justify-center rounded-md text-fg-secondary"
          >
            {/* Item 8 — copy button (micro): ikon morph jadi centang saat disalin. */}
            <AnimatePresence mode="wait" initial={false}>
              {disalin === "user" ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0, 0, 0, 1] }}
                  className="flex"
                >
                  <Check size={20} className="text-success" />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.2, ease: [0, 0, 0, 1] }}
                  className="flex"
                >
                  <Copy size={20} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <div className="min-w-0">
            <dt className="t-caption text-fg-secondary">Kata sandi</dt>
            <dd className="t-body truncate font-medium">{tampil ? password : "••••••••"}</dd>
          </div>
          <div className="flex shrink-0">
            <button
              onClick={() => setTampil((v) => !v)}
              aria-label={tampil ? "Sembunyikan kata sandi WiFi" : "Tampilkan kata sandi WiFi"}
              className="btn-anim flex size-12 items-center justify-center rounded-md text-fg-secondary"
            >
              {tampil ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button
              onClick={() => salin(password, "pass")}
              aria-label="Salin kata sandi WiFi"
              className="btn-anim flex size-12 items-center justify-center rounded-md text-fg-secondary"
            >
              <AnimatePresence mode="wait" initial={false}>
                {disalin === "pass" ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0, 0, 0, 1] }}
                    className="flex"
                  >
                    <Check size={20} className="text-success" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.2, ease: [0, 0, 0, 1] }}
                    className="flex"
                  >
                    <Copy size={20} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </dl>
    </section>
  );
}
