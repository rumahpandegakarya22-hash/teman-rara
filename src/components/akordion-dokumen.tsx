"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ExternalLink, FileText } from "lucide-react";

type Dokumen = { nama: string; judul: string };

/**
 * Daftar dokumen PDF sebagai accordion. Item 6 — layout animation: tinggi
 * konten dan reflow antar-item dianimasikan lewat prop `layout`, bukan
 * <details> bawaan yang membuka/menutup instan.
 */
export default function AkordionDokumen({
  dokumen,
  internal,
}: {
  dokumen: readonly Dokumen[];
  internal: boolean;
}) {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());

  const srcDari = (nama: string) => (internal ? `/api/dokumen/${nama}` : `/peraturan/${nama}.pdf`);

  const toggle = (nama: string) => {
    setTerbuka((lama) => {
      const baru = new Set(lama);
      if (baru.has(nama)) baru.delete(nama);
      else baru.add(nama);
      return baru;
    });
  };

  return (
    <motion.div layout className="flex flex-col gap-3">
      {dokumen.map((d) => {
        const src = srcDari(d.nama);
        const buka = terbuka.has(d.nama);
        return (
          <motion.div
            layout
            key={d.nama}
            className="overflow-hidden rounded-lg border border-line bg-raised/80 elev-1"
          >
            <button
              type="button"
              onClick={() => toggle(d.nama)}
              aria-expanded={buka}
              className="flex min-h-14 w-full items-center gap-3 p-5 text-left"
            >
              <FileText size={20} className="shrink-0 text-action" aria-hidden />
              <span className="t-body flex-1 font-medium">{d.judul}</span>
              <motion.span
                animate={{ rotate: buka ? 180 : 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="flex shrink-0 text-fg-secondary"
              >
                <ChevronDown size={20} aria-hidden />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {buka && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                  className="border-t border-line"
                >
                  <div className="p-4">
                    <a
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-anim mb-3 inline-flex min-h-12 items-center gap-1.5 t-label text-action"
                    >
                      <ExternalLink size={18} className="icon-flow" aria-hidden />
                      Buka di tab baru
                    </a>
                    <iframe
                      src={src}
                      title={d.judul}
                      className="h-[70vh] w-full rounded-md border border-line bg-surface"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
