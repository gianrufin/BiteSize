"use client";

import { useEffect } from "react";

// Registers the app-shell service worker so the browser can offer "Add to
// Home Screen" / install prompts and the app launches without browser chrome
// once installed. Silently no-ops if service workers aren't supported.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
