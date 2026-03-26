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
    <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger rounded-lg px-3 py-2.5 text-sm animate-scale-in">
      <AlertCircle size={16} className="shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded hover:bg-danger/20 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
