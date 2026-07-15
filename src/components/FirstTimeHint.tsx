"use client";

import { useEffect, useState } from "react";
import { hasSeenHint, markHintSeen } from "@/lib/session/hints";

export function FirstTimeHint({ id, message }: { id: string; message: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR — this sync-on-mount is the
    // external-system case the lint rule means to exempt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(!hasSeenHint(id));
  }, [id]);

  function dismiss() {
    markHintSeen(id);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-text">
      <p>{message}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted"
      >
        ✕
      </button>
    </div>
  );
}
