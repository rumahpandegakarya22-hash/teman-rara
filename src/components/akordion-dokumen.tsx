"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ExternalLink, FileText, Loader2 } from "lucide-react";

type Dokumen = { nama: string; judul: string };

type StatusPdf = "idle" | "memuat" | "siap" | "gagal";

/**
 * Untuk dokumen internal: PDF difetch client-side dulu (credentials: 'include'
 * agar cookie Clerk ikut), lalu dimasukkan ke iframe via blob URL.
 * Pola langsung <iframe src="/api/dokumen/..."> tidak bisa menampilkan PDF karena
 * browser modern menolak embed PDF dari API route yang mengembalikan stream binary
 * (bukan file statis).
 */
export default function AkordionDokumen({
  dokumen,
  internal,
}: {
  dokumen: readonly Dokumen[];
  internal: boolean;
}) {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Record<string, StatusPdf>>({});
  const blobUrls = useRef<Record<string, string>>({});

  // Bersihkan blob URL saat komponen unmount
  useEffect(() => {
    const urls = blobUrls.current;
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const srcDari = (nama: string) =>
    internal ? `/api/dokumen/${nama}` : `/peraturan/${nama}.pdf`;

  const muatPdf = async (nama: string) => {
    if (status[nama] && status[nama] !== "idle") return;
    setStatus((s) => ({ ...s, [nama]: "memuat" }));
    try {
      const res = await fetch(srcDari(nama), { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      blobUrls.current[nama] = URL.createObjectURL(blob);
      setStatus((s) => ({ ...s, [nama]: "siap" }));
    } catch {
      setStatus((s) => ({ ...s, [nama]: "gagal" }));
    }
  };

  const toggle = (nama: string) => {
    const sudahBuka = terbuka.has(nama);
    setTerbuka((prev) => {
      const baru = new Set(prev);
      if (sudahBuka) baru.delete(nama);
      else baru.add(nama);
      return baru;
    });
    if (!sudahBuka && internal && !status[nama]) {
      muatPdf(nama);
    }
  };

  return (
    <motion.div layout className="flex flex-col gap-3">
      {dokumen.map((d) => {
        const buka = terbuka.has(d.nama);
        const st = status[d.nama] ?? "idle";
        const blobUrl = blobUrls.current[d.nama];

        return (
          <motion.div
            layout
            key={d.nama}
            className="overflow-hidden rounded-lg border border-line bg-raised/60 backdrop-blur-2xl elev-1"
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
                      href={srcDari(d.nama)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-anim mb-3 inline-flex min-h-12 items-center gap-1.5 t-label text-action"
                    >
                      <ExternalLink size={18} className="icon-flow" aria-hidden />
                      Buka di tab baru
                    </a>

                    {internal ? (
                      st === "memuat" ? (
                        <div className="flex h-40 items-center justify-center rounded-md border border-line bg-surface">
                          <Loader2 size={24} className="animate-spin text-fg-secondary" aria-hidden />
                          <span className="sr-only">Memuat dokumen…</span>
                        </div>
                      ) : st === "gagal" ? (
                        <p className="t-body-sm text-danger">
                          Gagal memuat pratinjau. Gunakan tombol &ldquo;Buka di tab baru&rdquo; di atas.
                        </p>
                      ) : st === "siap" && blobUrl ? (
                        <iframe
                          src={blobUrl}
                          title={d.judul}
                          className="h-[70vh] w-full rounded-md border border-line bg-surface"
                        />
                      ) : null
                    ) : (
                      <iframe
                        src={srcDari(d.nama)}
                        title={d.judul}
                        className="h-[70vh] w-full rounded-md border border-line bg-surface"
                      />
                    )}
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
