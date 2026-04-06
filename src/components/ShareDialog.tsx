import { useState } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';

interface ShareDialogProps {
  shareUrl: string;
  onClose: () => void;
}

export default function ShareDialog({ shareUrl, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.querySelector<HTMLInputElement>('#share-url-input');
      if (input) {
        input.select();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-layered-lg ring-1 ring-white/[0.03] animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Share2 size={15} className="text-primary/70" />
            </div>
            <h2 id="share-dialog-title" className="text-base font-semibold text-text-primary tracking-tight">
              Share Trip
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close share dialog"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border border-transparent hover:border-border hover:bg-surface-light transition-all text-text-secondary/50 hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-text-secondary/60 mb-4">
          Anyone with this link can import a copy of your trip.
        </p>

        {/* URL Input + Copy Button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="share-url-input"
            type="text"
            readOnly
            value={shareUrl}
            className="w-full sm:flex-1 bg-surface-light/40 border border-border/60 rounded-xl px-4 py-3 text-sm text-text-primary truncate focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={handleCopy}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
              copied
                ? 'bg-success/15 text-success ring-1 ring-success/20'
                : 'bg-primary text-white hover:bg-primary-hover shadow-sm shadow-primary/20 active:scale-[0.98]'
            }`}
          >
            {copied ? (
              <>
                <Check size={14} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy Link
              </>
            )}
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl text-sm font-medium text-text-secondary/50 border border-border/40 hover:bg-surface-light/30 hover:text-text-secondary transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}
