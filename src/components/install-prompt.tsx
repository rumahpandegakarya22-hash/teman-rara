"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "tr.install.dismissed";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
  };

  return (
    <div className="fixed inset-x-4 bottom-[92px] z-50 mx-auto max-w-[688px] rounded-lg border border-line bg-raised p-5 elev-3">
      <div className="flex items-start gap-3">
        <Download size={24} className="mt-1 shrink-0 text-action" aria-hidden />
        <div className="flex-1">
          <h2 className="t-h3">Tambahkan ke Layar Utama</h2>
          <p className="t-body-sm mt-1 text-fg-secondary">
            Buka Teman Rara langsung dari ikon, tanpa membuka peramban.
          </p>
        </div>
        <button onClick={dismiss} aria-label="Tutup ajakan instal" className="-m-2 p-2 text-fg-secondary">
          <X size={20} aria-hidden />
        </button>
      </div>
      <button
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className="mt-4 min-h-12 w-full rounded-md bg-action px-6 t-label text-on-action active:bg-action-pressed"
      >
        Tambahkan Sekarang
      </button>
    </div>
  );
}
