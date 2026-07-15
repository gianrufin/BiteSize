"use client";

import { useEffect, useState } from "react";
import {
  getDeviceSettings,
  setTextSizePreference,
  type TextSizePreference,
} from "@/lib/session/settings";

const OPTIONS: { value: TextSizePreference; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "xl", label: "Extra large" },
];

export function TextSizeToggle() {
  const [textSize, setTextSize] = useState<TextSizePreference | null>(null);

  useEffect(() => {
    // localStorage isn't available during SSR — this sync-on-mount is the
    // external-system case the lint rule means to exempt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTextSize(getDeviceSettings().textSize);
  }, []);

  function handleSelect(next: TextSizePreference) {
    setTextSize(next);
    setTextSizePreference(next);
  }

  return (
    <div className="flex rounded-xl border border-border bg-bg p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleSelect(option.value)}
          className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition ${
            textSize === option.value ? "bg-accent text-accent-foreground" : "text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
