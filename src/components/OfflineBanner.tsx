import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-4">
      <div
        className="bg-accent/8 border border-accent/15 rounded-2xl px-4 py-3 animate-fade-in"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/15 text-accent/70 shrink-0">
            <WifiOff size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">You're offline</p>
            <p className="text-xs text-text-secondary/50">Your data is saved locally</p>
          </div>
        </div>
      </div>
    </div>
  );
}
