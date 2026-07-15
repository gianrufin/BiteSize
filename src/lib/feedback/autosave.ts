// Minimal pub-sub so any mutation path can flash the "Saved" indicator
// without importing a React component into plain lib code.
type Listener = () => void;
const listeners = new Set<Listener>();

export function notifySaved(): void {
  for (const listener of listeners) listener();
}

export function subscribeSaved(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
