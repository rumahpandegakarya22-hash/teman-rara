"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registrasi gagal (mis. mode privat) — aplikasi tetap jalan tanpa PWA */
    });
  }, []);

  return null;
}
