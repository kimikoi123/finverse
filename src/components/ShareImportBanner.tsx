import { Share2, X } from 'lucide-react';

interface ShareImportBannerProps {
  tripName: string;
  memberCount: number;
  expenseCount: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export default function ShareImportBanner({
  tripName,
  memberCount,
  expenseCount,
  onAccept,
  onDismiss,
}: ShareImportBannerProps) {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-4">
      <div
        className="bg-surface border border-primary/20 rounded-2xl p-4 animate-slide-up"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary/70 shrink-0">
            <Share2 size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-text-primary mb-1">
              Import shared trip?
            </h2>
            <p className="text-sm text-text-secondary/70 mb-0.5">
              <span className="font-medium text-text-primary">{tripName}</span>
            </p>
            <p className="text-xs text-text-secondary/50">
              {memberCount} {memberCount === 1 ? 'member' : 'members'} &middot; {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={onAccept}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-all shadow-sm shadow-primary/20 active:scale-[0.98]"
              >
                Import Trip
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary/60 border border-border/40 hover:bg-surface-light/30 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Dismiss shared trip import"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border border-transparent hover:border-border hover:bg-surface-light transition-all text-text-secondary/40 hover:text-text-primary shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
