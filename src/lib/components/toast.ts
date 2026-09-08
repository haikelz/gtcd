export type ToastVariant = "success" | "error" | "info";

export interface ToastMessage {
  readonly id: number;
  readonly message: string;
  readonly variant: ToastVariant;
}

type ToastListener = (message: ToastMessage) => void;

const listeners = new Set<ToastListener>();
const pendingToasts: ToastMessage[] = [];
let nextToastId = 0;

export function showToast(
  message: string,
  variant: ToastVariant = "info"
): void {
  const toast: ToastMessage = {
    id: nextToastId++,
    message,
    variant,
  };

  if (listeners.size === 0) {
    pendingToasts.push(toast);
    return;
  }

  for (const listener of listeners) listener(toast);
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  for (const toast of pendingToasts.splice(0)) listener(toast);

  return () => listeners.delete(listener);
}
