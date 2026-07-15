"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeSaved } from "@/lib/feedback/autosave";

export function AutosaveIndicator() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSaved(() => {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 1500);
    });
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className={`fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground shadow-md transition-opacity duration-300 motion-reduce:transition-none ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      Saved
    </div>
  );
}
