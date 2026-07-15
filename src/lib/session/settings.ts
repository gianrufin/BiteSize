export type ThemePreference = "system" | "light" | "dark";

export interface DeviceSettings {
  defaultGcashNumber: string | null;
  theme: ThemePreference;
}

// Also hardcoded in the pre-hydration theme script in app/layout.tsx — that script
// runs before any JS module graph loads, so it can't import this constant. Keep the
// two in sync if this key ever changes.
const STORAGE_KEY = "bitesize_settings";

const DEFAULTS: DeviceSettings = {
  defaultGcashNumber: null,
  theme: "system",
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

export function setThemePreference(theme: ThemePreference): void {
  writeSettings({ ...readSettings(), theme });
}
