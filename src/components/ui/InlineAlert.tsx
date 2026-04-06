import { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface InlineAlertProps {
  message: string | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export default function InlineAlert({ message, onDismiss, autoDismissMs }: InlineAlertProps) {
  useEffect(() => {
    if (!message || !autoDismissMs) return;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [message, autoDismissMs, onDismiss]);

  if (!message) return null;

  return (
    <div className="flex items-center gap-2.5 bg-danger/8 border border-danger/20 text-danger/80 rounded-xl px-3.5 py-3 text-sm animate-scale-in">
      <AlertCircle size={15} className="shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-danger/15 transition-all shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  );
}
