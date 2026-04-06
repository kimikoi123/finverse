import { RefreshCw, X } from 'lucide-react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';

export default function UpdatePrompt() {
  const { showUpdate, updateApp, dismissUpdate } = usePWAUpdate();

  if (!showUpdate) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="alert"
      aria-live="polite"
    >
      <div className="glass ring-1 ring-white/[0.03] rounded-2xl shadow-layered-lg animate-slide-up">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary/70 shrink-0">
            <RefreshCw size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Update available</p>
            <p className="text-xs text-text-secondary/50">Tap to get the latest version</p>
          </div>
          <button
            onClick={updateApp}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-all shadow-sm shadow-primary/20 active:scale-[0.98] shrink-0"
          >
            Update
          </button>
          <button
            onClick={dismissUpdate}
            aria-label="Dismiss update notification"
            className="p-1 text-text-secondary/30 hover:text-text-secondary transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
