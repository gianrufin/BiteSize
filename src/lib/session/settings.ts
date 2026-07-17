import type { SplitMode } from "@/types";

export type ThemePreference = "system" | "light" | "dark";
export type TextSizePreference = "default" | "large" | "xl";
export type MotionPreference = "system" | "reduced";

export interface DeviceSettings {
  defaultGcashNumber: string | null;
  defaultGcashQrUrl: string | null;
  theme: ThemePreference;
  textSize: TextSizePreference;
  motion: MotionPreference;
  lastSplitMode: SplitMode;
}

// Also hardcoded in the pre-hydration init script in app/layout.tsx — that script
// runs before any JS module graph loads, so it can't import this constant. Keep the
// two in sync if this key ever changes.
const STORAGE_KEY = "bitesize_settings";

const DEFAULTS: DeviceSettings = {
  defaultGcashNumber: null,
  defaultGcashQrUrl: null,
  theme: "system",
  textSize: "default",
  motion: "system",
  lastSplitMode: "items",
};

function readSettings(): DeviceSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DeviceSettings>) };
  } catch {
    return DEFAULTS;
  }
}

function writeSettings(settings: DeviceSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getDeviceSettings(): DeviceSettings {
  return readSettings();
}

export function setDefaultGcashNumber(value: string | null): void {
  writeSettings({ ...readSettings(), defaultGcashNumber: value });
}

export function setDefaultGcashQrUrl(value: string | null): void {
  writeSettings({ ...readSettings(), defaultGcashQrUrl: value });
}

export function setThemePreference(theme: ThemePreference): void {
  writeSettings({ ...readSettings(), theme });
}

export function setTextSizePreference(textSize: TextSizePreference): void {
  writeSettings({ ...readSettings(), textSize });
  document.documentElement.setAttribute("data-text-size", textSize);
}

export function setMotionPreference(motion: MotionPreference): void {
  writeSettings({ ...readSettings(), motion });
  if (motion === "reduced") {
    document.documentElement.setAttribute("data-motion", "reduced");
  } else {
    document.documentElement.removeAttribute("data-motion");
  }
}

export function setLastSplitMode(lastSplitMode: SplitMode): void {
  writeSettings({ ...readSettings(), lastSplitMode });
}
