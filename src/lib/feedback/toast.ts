export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

export interface ToastState extends ToastOptions {
  id: number;
}

type Listener = (toast: ToastState | null) => void;
const listeners = new Set<Listener>();
let counter = 0;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(options: ToastOptions): void {
  const toast: ToastState = { id: ++counter, durationMs: 4000, ...options };
  if (hideTimer) clearTimeout(hideTimer);
  for (const listener of listeners) listener(toast);
  hideTimer = setTimeout(() => {
    for (const listener of listeners) listener(null);
  }, toast.durationMs);
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
