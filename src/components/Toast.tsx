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
  return (
    <div className="glass ring-1 ring-white/[0.03] rounded-2xl shadow-layered-lg overflow-hidden animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <p className="text-sm text-text-primary flex-1">{toast.message}</p>
        <button
          onClick={() => onUndo(toast.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-light/80 hover:text-primary bg-primary/8 hover:bg-primary/15 rounded-lg transition-all active:scale-95"
        >
          <Undo2 size={11} />
          Undo
        </button>
        <button
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="p-1 text-text-secondary/30 hover:text-text-secondary transition-colors"
        >
          <X size={13} />
        </button>
      </div>
      <div className="h-[2px] bg-surface-light/30">
        <div
          className="h-full bg-primary/50"
          style={{
            animation: `progress-shrink ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export default function ToastContainer({ toasts, duration, onUndo, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-live="polite"
      role="status"
    >
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
