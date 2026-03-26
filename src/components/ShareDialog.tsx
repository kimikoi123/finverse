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
      // Fallback: select the input text so user can manually copy
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
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative bg-surface border border-border rounded-2xl p-5 w-full max-w-md shadow-xl animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-primary" />
            <h2 id="share-dialog-title" className="text-base font-semibold text-text-primary">
              Share Trip
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close share dialog"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-surface-light transition-colors text-text-secondary hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-text-secondary mb-3">
          Anyone with this link can import a copy of your trip.
        </p>

        {/* URL Input + Copy Button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="share-url-input"
            type="text"
            readOnly
            value={shareUrl}
            className="w-full sm:flex-1 bg-[#13131f] border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary truncate focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={handleCopy}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              copied
                ? 'bg-success/20 text-success'
                : 'bg-primary text-white hover:bg-primary/80'
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
          className="w-full mt-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary border border-border hover:bg-surface-light transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
