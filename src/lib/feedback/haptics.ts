// A short, subtle buzz for a successful tap-driven action (claiming an item,
// assigning it to someone). Feature-detected — most desktop browsers and
// iOS Safari simply don't have navigator.vibrate, so this is a no-op there.
export function vibrateSuccess(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(15);
  }
}
