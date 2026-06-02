import { useState, useCallback, useRef } from 'react';

export interface Toast {
  id: string;
  message: string;
  createdAt: number;
  undoable: boolean;
}

interface PendingToast extends Toast {
  onCommit?: () => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export const TOAST_DURATION = 5000;

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pendingRef = useRef<Map<string, PendingToast>>(new Map());

  const removeToast = useCallback((id: string) => {
    pendingRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Pass an onCommit callback to make the toast undoable: the action is
  // deferred and only runs when the toast expires or is dismissed, so the
  // Undo button can cancel it. Omit onCommit for plain success/info/error
  // toasts — no (non-functional) Undo button is shown.
  const showToast = useCallback((message: string, onCommit?: () => void): string => {
    const id = `toast-${++nextId}`;
    const now = Date.now();
    const undoable = onCommit !== undefined;

    const timeoutId = setTimeout(() => {
      const pending = pendingRef.current.get(id);
      if (pending) {
        pending.onCommit?.();
        removeToast(id);
      }
    }, TOAST_DURATION);

    const pending: PendingToast = { id, message, createdAt: now, undoable, onCommit, timeoutId };
    pendingRef.current.set(id, pending);
    setToasts((prev) => [...prev, { id, message, createdAt: now, undoable }]);

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
      pending.onCommit?.();
    }
    removeToast(id);
  }, [removeToast]);

  return { toasts, showToast, undoToast, dismissToast, duration: TOAST_DURATION };
}
