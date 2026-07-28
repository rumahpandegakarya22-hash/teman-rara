"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "default" | "granted" | "denied" | "loading";

export default function NotificationOptIn() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as Status);
  }, []);

  if (status === "unsupported" || status === "loading" || status === "granted") return null;

  const aktifkan = async () => {
    setStatus("loading");
    const izin = await Notification.requestPermission();
    if (izin !== "granted") {
      setStatus(izin as Status);
      return;
    }

    const kunci = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (kunci) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(kunci),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch {
        /* langganan push gagal — notifikasi in-app tetap berfungsi */
      }
    }
    setStatus("granted");
  };

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-line bg-raised p-5 elev-1">
      <Bell size={24} className="shrink-0 text-action" aria-hidden />
      <div className="flex-1">
        <h2 className="t-h3">Aktifkan pemberitahuan</h2>
        <p className="t-body-sm mt-1 text-fg-secondary">
          {status === "denied"
            ? "Izin notifikasi ditolak. Aktifkan lewat pengaturan peramban."
            : "Dapatkan kabar saat ada pengumuman atau peraturan baru."}
        </p>
      </div>
      {status === "default" && (
        <button
          onClick={aktifkan}
          className="btn-anim min-h-12 shrink-0 rounded-md bg-action px-4 t-label text-on-action active:bg-action-pressed"
        >
          Aktifkan
        </button>
      )}
      {status === "denied" && <Check size={20} className="text-fg-disabled" aria-hidden />}
    </div>
  );
}
