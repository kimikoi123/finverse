import { useState, useCallback, useRef } from 'react';

export interface Toast {
  id: string;
  message: string;
  createdAt: number;
}

interface PendingToast extends Toast {
  onCommit: () => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const TOAST_DURATION = 5000;

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pendingRef = useRef<Map<string, PendingToast>>(new Map());

  const removeToast = useCallback((id: string) => {
    pendingRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, onCommit: () => void): string => {
    const id = `toast-${++nextId}`;
    const now = Date.now();

    const timeoutId = setTimeout(() => {
      const pending = pendingRef.current.get(id);
      if (pending) {
        pending.onCommit();
        removeToast(id);
      }
    }, TOAST_DURATION);

    const pending: PendingToast = { id, message, createdAt: now, onCommit, timeoutId };
    pendingRef.current.set(id, pending);
    setToasts((prev) => [...prev, { id, message, createdAt: now }]);

    return id;
  }, [removeToast]);

  const undoToast = useCallback((id: string) => {
    const pending = pendingRef.current.get(id);
    if (pending) {
      clearTimeout(pending.timeoutId);
    }
    removeToast(id);
  }, [removeToast]);

  const dismissToast = useCallback((id: string) => {
    const pending = pendingRef.current.get(id);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pending.onCommit();
    }
    removeToast(id);
  }, [removeToast]);

  return { toasts, showToast, undoToast, dismissToast, duration: TOAST_DURATION };
}
