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
    <header className="glass sticky top-0 z-40 px-4 py-3 sm:px-6 shadow-[0_1px_0_0_rgba(63,63,95,0.5),0_4px_12px_-4px_rgba(0,0,0,0.3)]" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeTrip ? (
            <button
              onClick={onBack}
              aria-label="Go back to trip list"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-light transition-colors text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/25 to-accent/15 text-primary">
              <PlaneTakeoff size={20} />
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-text-primary leading-tight tracking-tight">
              {activeTrip ? activeTrip.name : 'SplitTrip'}
            </h1>
            {!activeTrip && (
              <p className="text-xs text-text-secondary">Travel expense splitter</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onExport}
            aria-label="Export data"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-light transition-colors text-text-secondary hover:text-text-primary"
            title="Export data"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Import data"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-light transition-colors text-text-secondary hover:text-text-primary"
            title="Import data"
          >
            <Upload size={18} />
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
      <InlineAlert message={importError} onDismiss={dismissImportError} autoDismissMs={5000} />
    </header>
  );
}
