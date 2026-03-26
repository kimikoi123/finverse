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
        className="bg-surface border border-primary/30 rounded-xl p-4"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0">
            <Share2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-text-primary mb-1">
              Import shared trip?
            </h2>
            <p className="text-sm text-text-secondary mb-0.5">
              <span className="font-medium text-text-primary">{tripName}</span>
            </p>
            <p className="text-xs text-text-secondary">
              {memberCount} {memberCount === 1 ? 'member' : 'members'} · {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={onAccept}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/80 transition-colors"
              >
                Import Trip
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary border border-border hover:bg-surface-light transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Dismiss shared trip import"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-surface-light transition-colors text-text-secondary hover:text-text-primary shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
