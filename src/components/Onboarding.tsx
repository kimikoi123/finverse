import { useState } from 'react';
import { CURRENCIES } from '../utils/currencies';
import type { ThemePreference } from '../types';

interface OnboardingProps {
  onComplete: (prefs: {
    displayName: string;
    defaultCurrency: string;
    theme: ThemePreference;
  }) => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; emoji: string }[] = [
  { value: 'light', label: 'Light', emoji: '\u2600\uFE0F' },
  { value: 'dark', label: 'Dark', emoji: '\uD83C\uDF19' },
  { value: 'system', label: 'System', emoji: '\u2699\uFE0F' },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [displayName, setDisplayName] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('PHP');
  const [theme, setTheme] = useState<ThemePreference>('system');

  const canSubmit = displayName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onComplete({
      displayName: displayName.trim(),
      defaultCurrency,
      theme,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        {/* Icon + heading */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-5xl" role="img" aria-label="Money bag">
            {'\uD83D\uDCB0'}
          </span>
          <h1
            className="text-2xl font-bold text-text-primary tracking-tight"
            data-heading
          >
            Welcome!
          </h1>
          <p className="text-sm text-text-secondary">
            Let&apos;s get you set up.
          </p>
        </div>

        {/* Form fields */}
        <div className="w-full flex flex-col gap-5">
          {/* Display name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="onboarding-name"
              className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider"
            >
              Display Name
            </label>
            <input
              id="onboarding-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/50 outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
          </div>

          {/* Default currency */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="onboarding-currency"
              className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider"
            >
              Default Currency
            </label>
            <select
              id="onboarding-currency"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow appearance-none"
            >
              {Object.entries(CURRENCIES).map(([code, config]) => (
                <option key={code} value={code}>
                  {config.symbol} {code} — {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme preference */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
              Theme
            </span>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    theme === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-primary text-white rounded-2xl py-3.5 font-semibold text-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Get Started
        </button>
      </form>
    </div>
  );
}
