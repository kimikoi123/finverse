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
    <header className="bg-surface border-b border-border px-4 py-3 sm:px-6" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeTrip ? (
            <button
              onClick={onBack}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-light transition-colors text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <PlaneTakeoff size={20} />
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-text-primary leading-tight">
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
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-light transition-colors text-text-secondary hover:text-text-primary"
            title="Export data"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
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
            className="hidden"
          />
        </div>
      </div>
      <InlineAlert message={importError} onDismiss={dismissImportError} autoDismissMs={5000} />
    </header>
  );
}
