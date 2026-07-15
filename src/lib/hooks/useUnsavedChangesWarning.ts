import { useEffect } from "react";

// Warns before a tab close/refresh/back-navigation would silently discard
// text someone has typed but not yet submitted (item name, a paste-items
// block, an in-progress rename) — the rest of the app autosaves on submit,
// so this is the one real "unsaved work" gap.
export function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}
