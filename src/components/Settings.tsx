import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Sun, Moon, Monitor, Download, Upload } from 'lucide-react';
import type { UserPreferences, ThemePreference } from '../types';
import { CURRENCIES } from '../utils/currencies';

interface SettingsProps {
  preferences: UserPreferences;
  onUpdate: (updates: Partial<UserPreferences>) => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onExport: () => void;
  onImport: (json: string) => boolean;
  onBack: () => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export default function Settings({
  preferences,
  onUpdate,
  theme,
  onThemeChange,
  onExport,
  onImport,
  onBack,
}: SettingsProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(preferences.displayName);
  const [editingCurrency, setEditingCurrency] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveName = useCallback(() => {
    const trimmed = nameValue.trim();
    if (trimmed.length > 0 && trimmed !== preferences.displayName) {
      onUpdate({ displayName: trimmed });
    } else {
      setNameValue(preferences.displayName);
    }
    setEditingName(false);
  }, [nameValue, preferences.displayName, onUpdate]);

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveName();
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ defaultCurrency: e.target.value });
    setEditingCurrency(false);
  };

  const handlePaydayDayBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 31) {
      onUpdate({ paydayDay: val });
    } else if (e.target.value === '') {
      onUpdate({ paydayDay: undefined });
    }
  };

  const handlePaydayAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      onUpdate({ paydayAmount: val });
    } else if (e.target.value === '') {
      onUpdate({ paydayAmount: undefined });
    }
  };

  const handlePaydayCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ paydayCurrency: e.target.value });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onImport(ev.target?.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          aria-label="Go back"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-transparent hover:border-border hover:bg-surface-light transition-all text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-text-primary" data-heading>
          Settings
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        {/* Profile Section */}
        <section>
          <h2 className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 px-1">
            Profile
          </h2>
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            {/* Display name */}
            <div className="flex justify-between items-center py-3 px-4 border-b border-border">
              <span className="text-sm text-text-primary">Display name</span>
              {editingName ? (
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={handleNameKeyDown}
                  autoFocus
                  className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow w-40 text-right"
                />
              ) : (
                <button
                  onClick={() => {
                    setNameValue(preferences.displayName);
                    setEditingName(true);
                  }}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  {preferences.displayName}
                </button>
              )}
            </div>

            {/* Default currency */}
            <div className="flex justify-between items-center py-3 px-4">
              <span className="text-sm text-text-primary">Default currency</span>
              {editingCurrency ? (
                <select
                  value={preferences.defaultCurrency}
                  onChange={handleCurrencyChange}
                  onBlur={() => setEditingCurrency(false)}
                  autoFocus
                  className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow appearance-none"
                >
                  {Object.entries(CURRENCIES).map(([code, config]) => (
                    <option key={code} value={code}>
                      {config.symbol} {code} — {config.name}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setEditingCurrency(true)}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  {CURRENCIES[preferences.defaultCurrency]?.symbol ?? ''} {preferences.defaultCurrency}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Payday Section */}
        <section>
          <h2 className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 px-1">
            Payday
          </h2>
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            {/* Day of month */}
            <div className="flex justify-between items-center py-3 px-4 border-b border-border">
              <span className="text-sm text-text-primary">Day of month</span>
              <input
                type="number"
                min={1}
                max={31}
                defaultValue={preferences.paydayDay ?? ''}
                placeholder="Not set"
                onBlur={handlePaydayDayBlur}
                className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow w-24 text-right placeholder:text-text-secondary/50"
              />
            </div>

            {/* Amount */}
            <div className="flex justify-between items-center py-3 px-4 border-b border-border">
              <span className="text-sm text-text-primary">Amount</span>
              <input
                type="number"
                min={0}
                step="0.01"
                defaultValue={preferences.paydayAmount ?? ''}
                placeholder="Not set"
                onBlur={handlePaydayAmountBlur}
                className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow w-32 text-right placeholder:text-text-secondary/50"
              />
            </div>

            {/* Currency */}
            <div className="flex justify-between items-center py-3 px-4">
              <span className="text-sm text-text-primary">Currency</span>
              <select
                value={preferences.paydayCurrency ?? preferences.defaultCurrency}
                onChange={handlePaydayCurrencyChange}
                className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow appearance-none"
              >
                {Object.entries(CURRENCIES).map(([code, config]) => (
                  <option key={code} value={code}>
                    {config.symbol} {code} — {config.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Appearance Section */}
        <section>
          <h2 className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 px-1">
            Appearance
          </h2>
          <div className="bg-surface rounded-2xl border border-border overflow-hidden p-4">
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onThemeChange(value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                    theme === value
                      ? 'bg-primary text-white'
                      : 'bg-surface-light border border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Data Section */}
        <section>
          <h2 className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 px-1">
            Data
          </h2>
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <button
              onClick={onExport}
              className="flex justify-between items-center py-3 px-4 border-b border-border w-full text-left hover:bg-surface-light transition-colors"
            >
              <span className="text-sm text-text-primary">Export data</span>
              <Download size={16} className="text-text-secondary" />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex justify-between items-center py-3 px-4 w-full text-left hover:bg-surface-light transition-colors"
            >
              <span className="text-sm text-text-primary">Import data</span>
              <Upload size={16} className="text-text-secondary" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              aria-label="Import backup file"
              className="hidden"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
