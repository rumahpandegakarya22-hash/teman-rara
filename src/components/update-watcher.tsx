"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const SEEN_KEY = "tr.board.lastSeen";
const POLL_MS = 300_000;

/**
 * Mendeteksi pembaruan papan informasi: bandingkan updated_at terbaru dari server
 * dengan yang terakhir dilihat di perangkat ini. Kalau izin notifikasi sudah
 * diberikan, tampilkan juga notifikasi browser. Polling hanya saat tab terlihat:
 * tab di latar tidak perlu membebani server, dan push sudah mengabari penghuni.
 */
export default function UpdateWatcher() {
  const [pembaruan, setPembaruan] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;

    const cek = async () => {
      try {
        const res = await fetch("/api/board/recent-updates", { cache: "no-store" });
        if (!res.ok) return;
        const { updated_at } = (await res.json()) as { updated_at: string | null };
        if (batal || !updated_at) return;

        const terakhir = localStorage.getItem(SEEN_KEY);
        if (!terakhir) {
          localStorage.setItem(SEEN_KEY, updated_at);
          return;
        }
        if (updated_at > terakhir) {
          setPembaruan(updated_at);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Papan Informasi diperbarui", {
              body: "Ada peraturan atau pengumuman baru dari pengelola.",
              icon: "/icons/icon-192.png",
            });
          }
        }
      } catch {
        /* offline — abaikan, coba lagi di siklus berikutnya */
      }
    };

    let id: ReturnType<typeof setInterval> | undefined;
    const mulai = () => {
      cek();
      id = setInterval(cek, POLL_MS);
    };
    const henti = () => {
      clearInterval(id);
      id = undefined;
    };
    const saatVisibilitasBerubah = () => {
      if (document.visibilityState === "visible") {
        if (id === undefined) mulai();
      } else henti();
    };

    if (document.visibilityState === "visible") mulai();
    document.addEventListener("visibilitychange", saatVisibilitasBerubah);
    return () => {
      batal = true;
      henti();
      document.removeEventListener("visibilitychange", saatVisibilitasBerubah);
    };
  }, []);

  if (!pembaruan) return null;

  return (
    <div
      role="status"
      className="mb-6 flex items-center gap-3 rounded-lg border border-line bg-sunken p-4"
    >
      <RefreshCw size={20} className="shrink-0 text-action" aria-hidden />
      <p className="t-body-sm flex-1">Papan informasi sudah diperbarui.</p>
      <button
        onClick={() => {
          localStorage.setItem(SEEN_KEY, pembaruan);
          location.reload();
        }}
        className="btn-anim min-h-12 rounded-md px-3 t-label text-action"
      >
        Muat ulang
      </button>
    </div>
  );
}
