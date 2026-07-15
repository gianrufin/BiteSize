"use client";

import { useEffect, useState } from "react";
import {
  getDeviceSettings,
  setMotionPreference,
  type MotionPreference,
} from "@/lib/session/settings";

const OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "reduced", label: "Reduced" },
];

export function MotionToggle() {
  const [motion, setMotion] = useState<MotionPreference | null>(null);

  useEffect(() => {
    // localStorage isn't available during SSR — this sync-on-mount is the
    // external-system case the lint rule means to exempt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMotion(getDeviceSettings().motion);
  }, []);

  function handleSelect(next: MotionPreference) {
    setMotion(next);
    setMotionPreference(next);
  }

  return (
    <div className="flex rounded-xl border border-border bg-bg p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleSelect(option.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            motion === option.value ? "bg-accent text-accent-foreground" : "text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
