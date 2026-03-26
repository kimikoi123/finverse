import { useEffect, useState } from 'react';
import { X, Undo2 } from 'lucide-react';
import type { Toast as ToastData } from '../hooks/useToast';

interface ToastProps {
  toasts: ToastData[];
  duration: number;
  onUndo: (id: string) => void;
  onDismiss: (id: string) => void;
}

function ToastItem({
  toast,
  duration,
  onUndo,
  onDismiss,
}: {
  toast: ToastData;
  duration: number;
  onUndo: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = toast.createdAt;
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [toast.createdAt, duration]);

  return (
    <div className="bg-surface border border-border rounded-xl shadow-lg shadow-black/30 overflow-hidden animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="text-sm text-text-primary flex-1">{toast.message}</p>
        <button
          onClick={() => onUndo(toast.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-light hover:text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
        >
          <Undo2 size={12} />
          Undo
        </button>
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-1 text-text-secondary hover:text-text-primary transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <div className="h-0.5 bg-surface-light">
        <div
          className="h-full bg-primary transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function ToastContainer({ toasts, duration, onUndo, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          duration={duration}
          onUndo={onUndo}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
