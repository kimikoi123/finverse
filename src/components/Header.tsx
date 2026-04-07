import { ArrowLeft, Wallet, Settings } from 'lucide-react';
import type { Trip } from '../types';

interface HeaderProps {
  activeTrip: Trip | null;
  onBack: () => void;
  onOpenSettings: () => void;
  showTripNav?: boolean;
  showBackNav?: boolean;
  backLabel?: string;
}

export default function Header({ activeTrip, onBack, onOpenSettings, showTripNav, showBackNav, backLabel }: HeaderProps) {
  return (
    <header
      className="glass sticky top-0 z-40 px-4 py-3 sm:px-6"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(showTripNav && activeTrip) || showBackNav ? (
            <>
              <button
                onClick={onBack}
                aria-label="Go back"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-transparent hover:border-border hover:bg-surface-light transition-all text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-1.5">
                {showTripNav && activeTrip ? (
                  <>
                    <span className="hidden sm:inline text-xs text-text-secondary">Trips /</span>
                    <h1 className="text-base font-semibold text-text-primary/90 leading-tight tracking-tight">
                      {activeTrip.name}
                    </h1>
                  </>
                ) : backLabel ? (
                  <h1 className="text-base font-semibold text-text-primary/90 leading-tight tracking-tight">
                    {backLabel}
                  </h1>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary-light/8 text-primary ring-1 ring-primary/10">
                <Wallet size={18} />
              </div>
              <div>
                <h1 className="text-base font-semibold text-text-primary leading-tight tracking-tight" data-heading>
                  Finance
                </h1>
                <p className="text-[11px] text-text-secondary/60 mt-0.5">Personal tracker</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {!showBackNav && !(showTripNav && activeTrip) && (
            <button
              onClick={onOpenSettings}
              aria-label="Settings"
              title="Settings"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-transparent hover:border-border hover:bg-surface-light transition-all text-text-secondary hover:text-text-primary"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(45,106,79,0.2) 30%, rgba(245,166,35,0.1) 70%, transparent)',
        }}
      />
    </header>
  );
}
