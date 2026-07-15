"use client";

import { useEffect, useState } from "react";
import { getDeviceSettings, setThemePreference, type ThemePreference } from "@/lib/session/settings";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function applyTheme(theme: ThemePreference) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference | null>(null);

  useEffect(() => {
    // localStorage isn't available during SSR — this sync-on-mount is the
    // external-system case the lint rule means to exempt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(getDeviceSettings().theme);
  }, []);

  function handleSelect(next: ThemePreference) {
    setTheme(next);
    setThemePreference(next);
    applyTheme(next);
  }

  return (
    <div className="flex rounded-xl border border-border bg-bg p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleSelect(option.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            theme === option.value
              ? "bg-accent text-accent-foreground"
              : "text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
