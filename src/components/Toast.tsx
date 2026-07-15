"use client";

import { useEffect, useState } from "react";
import { subscribeToast, type ToastState } from "@/lib/feedback/toast";

export function Toast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => subscribeToast(setToast), []);

  if (!toast) return null;

  return (
    <div className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md">
      <div className="flex items-center justify-between gap-3 card-lg px-4 py-3">
        <p className="text-sm text-text">{toast.message}</p>
        {toast.actionLabel && toast.onAction ? (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              setToast(null);
            }}
            className="shrink-0 text-sm font-medium text-accent"
          >
            {toast.actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
