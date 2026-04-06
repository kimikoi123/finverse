import { ArrowLeft, Download, Upload, PlaneTakeoff } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import InlineAlert from './ui/InlineAlert';
import type { Trip } from '../types';

interface HeaderProps {
  activeTrip: Trip | null;
  onBack: () => void;
  onExport: () => void;
  onImport: (json: string) => boolean;
}

export default function Header({ activeTrip, onBack, onExport, onImport }: HeaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const dismissImportError = useCallback(() => setImportError(null), []);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const success = onImport(ev.target?.result as string);
      if (!success) setImportError('Invalid backup file');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header
      className="glass sticky top-0 z-40 px-4 py-3.5 sm:px-6"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.875rem)' }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeTrip ? (
            <button
              onClick={onBack}
              aria-label="Go back to trip list"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-transparent hover:border-border hover:bg-surface-light transition-all text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary-light/8 text-primary ring-1 ring-primary/10">
              <PlaneTakeoff size={18} />
            </div>
          )}
          <div>
            {activeTrip ? (
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-xs text-text-secondary">Trips /</span>
                <h1 className="text-base font-semibold text-text-primary/90 leading-tight tracking-tight">
                  {activeTrip.name}
                </h1>
              </div>
            ) : (
              <>
                <h1 className="text-base font-semibold text-text-primary leading-tight tracking-tight" data-heading>
                  SplitTrip
                </h1>
                <p className="text-[11px] text-text-secondary/60 mt-0.5">Travel expense splitter</p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onExport}
            aria-label="Export data"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-transparent hover:border-border hover:bg-surface-light transition-all text-text-secondary hover:text-text-primary"
            title="Export data"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Import data"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-transparent hover:border-border hover:bg-surface-light transition-all text-text-secondary hover:text-text-primary"
            title="Import data"
          >
            <Upload size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            aria-label="Import backup file"
            className="hidden"
          />
        </div>
      </div>
      {/* Gradient accent border */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.2) 30%, rgba(245,166,35,0.1) 70%, transparent)',
        }}
      />
      <InlineAlert message={importError} onDismiss={dismissImportError} autoDismissMs={5000} />
    </header>
  );
}
