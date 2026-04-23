import { useState, useRef, useCallback } from 'react';
import { Sun, Moon, Monitor, Download, Upload, EyeOff, Calculator, ChevronRight, Wand2 } from 'lucide-react';
import type { UserPreferences, ThemePreference, PaydayConfig, PaydayFrequency } from '../types';
import { CURRENCIES } from '../utils/currencies';
import SyncSettingsSection from '../features/sync/SyncSettingsSection';

interface SettingsProps {
  preferences: UserPreferences;
  onUpdate: (updates: Partial<UserPreferences>) => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onExport: () => void;
  onImport: (json: string) => boolean;
  onBack: () => void;
  privacyMode?: boolean;
  onTogglePrivacy?: () => void;
  onOpenTaxCalculator: () => void;
  onOpenRules: () => void;
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
  privacyMode,
  onTogglePrivacy,
  onOpenTaxCalculator,
  onOpenRules,
}: SettingsProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(preferences.displayName);
  const [editingCurrency, setEditingCurrency] = useState(false);
  const [paydayErrors, setPaydayErrors] = useState<Record<string, string | null>>({});
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

  const paydayConfig = preferences.paydayConfig;
  const paydayFrequency: PaydayFrequency = paydayConfig?.frequency ?? 'monthly';

  const handlePaydayFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const freq = e.target.value as PaydayFrequency;
    const currency = paydayConfig?.currency ?? preferences.defaultCurrency;
    let newConfig: PaydayConfig;
    switch (freq) {
      case 'monthly':
        newConfig = { frequency: 'monthly', day: 15, amount: 0, currency };
        break;
      case 'semi-monthly':
        newConfig = { frequency: 'semi-monthly', day1: 15, amount1: 0, day2: 30, amount2: 0, currency };
        break;
      case 'biweekly':
        newConfig = { frequency: 'biweekly', refDate: new Date().toISOString().slice(0, 10), amount: 0, currency };
        break;
      case 'weekly':
        newConfig = { frequency: 'weekly', refDate: new Date().toISOString().slice(0, 10), amount: 0, currency };
        break;
    }
    setPaydayErrors({});
    onUpdate({ paydayConfig: newConfig });
  };

  const updatePaydayField = (field: string, value: unknown) => {
    if (!paydayConfig) return;
    onUpdate({ paydayConfig: { ...paydayConfig, [field]: value } as PaydayConfig });
  };

  const handleDayBlur = (field: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setPaydayErrors(prev => ({ ...prev, [field]: null }));
      return;
    }
    const val = parseInt(raw, 10);
    if (isNaN(val) || val < 1 || val > 31) {
      setPaydayErrors(prev => ({ ...prev, [field]: 'Enter a day between 1 and 31.' }));
      return;
    }
    setPaydayErrors(prev => ({ ...prev, [field]: null }));
    updatePaydayField(field, val);
  };

  const handleAmountBlur = (field: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setPaydayErrors(prev => ({ ...prev, [field]: null }));
      return;
    }
    const val = parseFloat(raw);
    if (isNaN(val)) {
      setPaydayErrors(prev => ({ ...prev, [field]: 'Enter a valid amount.' }));
      return;
    }
    if (val <= 0) {
      setPaydayErrors(prev => ({ ...prev, [field]: 'Amount must be greater than 0.' }));
      return;
    }
    setPaydayErrors(prev => ({ ...prev, [field]: null }));
    updatePaydayField(field, val);
  };

  const handleRefDateChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePaydayField(field, e.target.value);
  };

  const handlePaydayCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updatePaydayField('currency', e.target.value);
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
                  className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow appearance-none select-chevron"
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
            {/* Frequency */}
            <div className="flex justify-between items-center py-3 px-4 border-b border-border">
              <span className="text-sm text-text-primary">Frequency</span>
              <select
                value={paydayFrequency}
                onChange={handlePaydayFrequencyChange}
                className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow appearance-none select-chevron"
              >
                <option value="monthly">Monthly</option>
                <option value="semi-monthly">Semi-monthly</option>
                <option value="biweekly">Biweekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            {/* Monthly fields */}
            {paydayConfig?.frequency === 'monthly' && (
              <>
                <div className="py-3 px-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-primary">Day of month</span>
                    <input type="number" min={1} max={31} defaultValue={paydayConfig.day || ''} placeholder="15" onBlur={handleDayBlur('day')} className={`bg-surface border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 transition-shadow w-24 text-right placeholder:text-text-secondary/50 ${paydayErrors.day ? 'border-danger/60 focus:ring-danger/30' : 'border-border focus:ring-primary/40'}`} />
                  </div>
                  {paydayErrors.day && <p className="text-xs text-danger mt-1.5 text-right">{paydayErrors.day}</p>}
                </div>
                <div className="py-3 px-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-primary">Amount</span>
                    <input type="number" min={0} step="0.01" defaultValue={paydayConfig.amount || ''} placeholder="0.00" onBlur={handleAmountBlur('amount')} className={`bg-surface border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 transition-shadow w-32 text-right placeholder:text-text-secondary/50 ${paydayErrors.amount ? 'border-danger/60 focus:ring-danger/30' : 'border-border focus:ring-primary/40'}`} />
                  </div>
                  {paydayErrors.amount && <p className="text-xs text-danger mt-1.5 text-right">{paydayErrors.amount}</p>}
                </div>
              </>
            )}

            {/* Semi-monthly fields */}
            {paydayConfig?.frequency === 'semi-monthly' && (
              <>
                <div className="py-3 px-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-primary">1st payday (day)</span>
                    <input type="number" min={1} max={31} defaultValue={paydayConfig.day1 || ''} placeholder="15" onBlur={handleDayBlur('day1')} className={`bg-surface border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 transition-shadow w-24 text-right placeholder:text-text-secondary/50 ${paydayErrors.day1 ? 'border-danger/60 focus:ring-danger/30' : 'border-border focus:ring-primary/40'}`} />
                  </div>
                  {paydayErrors.day1 && <p className="text-xs text-danger mt-1.5 text-right">{paydayErrors.day1}</p>}
                </div>
                <div className="py-3 px-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-primary">1st payday amount</span>
                    <input type="number" min={0} step="0.01" defaultValue={paydayConfig.amount1 || ''} placeholder="0.00" onBlur={handleAmountBlur('amount1')} className={`bg-surface border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 transition-shadow w-32 text-right placeholder:text-text-secondary/50 ${paydayErrors.amount1 ? 'border-danger/60 focus:ring-danger/30' : 'border-border focus:ring-primary/40'}`} />
                  </div>
                  {paydayErrors.amount1 && <p className="text-xs text-danger mt-1.5 text-right">{paydayErrors.amount1}</p>}
                </div>
                <div className="py-3 px-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-primary">2nd payday (day)</span>
                    <input type="number" min={1} max={31} defaultValue={paydayConfig.day2 || ''} placeholder="30" onBlur={handleDayBlur('day2')} className={`bg-surface border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 transition-shadow w-24 text-right placeholder:text-text-secondary/50 ${paydayErrors.day2 ? 'border-danger/60 focus:ring-danger/30' : 'border-border focus:ring-primary/40'}`} />
                  </div>
                  {paydayErrors.day2 && <p className="text-xs text-danger mt-1.5 text-right">{paydayErrors.day2}</p>}
                </div>
                <div className="py-3 px-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-primary">2nd payday amount</span>
                    <input type="number" min={0} step="0.01" defaultValue={paydayConfig.amount2 || ''} placeholder="0.00" onBlur={handleAmountBlur('amount2')} className={`bg-surface border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 transition-shadow w-32 text-right placeholder:text-text-secondary/50 ${paydayErrors.amount2 ? 'border-danger/60 focus:ring-danger/30' : 'border-border focus:ring-primary/40'}`} />
                  </div>
                  {paydayErrors.amount2 && <p className="text-xs text-danger mt-1.5 text-right">{paydayErrors.amount2}</p>}
                </div>
              </>
            )}

            {/* Biweekly fields */}
            {paydayConfig?.frequency === 'biweekly' && (
              <>
                <div className="py-3 px-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-primary">Last payday date</span>
                    <input type="date" defaultValue={paydayConfig.refDate} onChange={handleRefDateChange('refDate')} className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow" />
                  </div>
                </div>
                <div className="py-3 px-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-primary">Amount</span>
                    <input type="number" min={0} step="0.01" defaultValue={paydayConfig.amount || ''} placeholder="0.00" onBlur={handleAmountBlur('amount')} className={`bg-surface border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 transition-shadow w-32 text-right placeholder:text-text-secondary/50 ${paydayErrors.amount ? 'border-danger/60 focus:ring-danger/30' : 'border-border focus:ring-primary/40'}`} />
                  </div>
                  {paydayErrors.amount && <p className="text-xs text-danger mt-1.5 text-right">{paydayErrors.amount}</p>}
                </div>
              </>
            )}

            {/* Weekly fields */}
            {paydayConfig?.frequency === 'weekly' && (
              <>
                <div className="py-3 px-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-primary">Last payday date</span>
                    <input type="date" defaultValue={paydayConfig.refDate} onChange={handleRefDateChange('refDate')} className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow" />
                  </div>
                </div>
                <div className="py-3 px-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-primary">Amount</span>
                    <input type="number" min={0} step="0.01" defaultValue={paydayConfig.amount || ''} placeholder="0.00" onBlur={handleAmountBlur('amount')} className={`bg-surface border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 transition-shadow w-32 text-right placeholder:text-text-secondary/50 ${paydayErrors.amount ? 'border-danger/60 focus:ring-danger/30' : 'border-border focus:ring-primary/40'}`} />
                  </div>
                  {paydayErrors.amount && <p className="text-xs text-danger mt-1.5 text-right">{paydayErrors.amount}</p>}
                </div>
              </>
            )}

            {/* Currency (shared across all frequencies) */}
            {paydayConfig && (
              <div className="flex justify-between items-center py-3 px-4">
                <span className="text-sm text-text-primary">Currency</span>
                <select
                  value={paydayConfig.currency ?? preferences.defaultCurrency}
                  onChange={handlePaydayCurrencyChange}
                  className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow appearance-none select-chevron"
                >
                  {Object.entries(CURRENCIES).map(([code, config]) => (
                    <option key={code} value={code}>
                      {config.symbol} {code} — {config.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

        {/* Privacy Section */}
        {onTogglePrivacy && (
          <section>
            <h2 className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 px-1">
              Privacy
            </h2>
            <div className="bg-surface rounded-2xl border border-border overflow-hidden">
              <button
                onClick={onTogglePrivacy}
                className="flex justify-between items-center py-3 px-4 w-full text-left hover:bg-surface-light transition-colors"
              >
                <div>
                  <span className="text-sm text-text-primary">Hide balances</span>
                  <p className="text-[11px] text-text-secondary/60 mt-0.5">Censor all amounts and balances</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors flex items-center ${privacyMode ? 'bg-primary justify-end' : 'bg-border justify-start'}`}>
                  <div className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5 flex items-center justify-center">
                    {privacyMode && <EyeOff size={10} className="text-primary" />}
                  </div>
                </div>
              </button>
            </div>
          </section>
        )}

        {/* Tools Section */}
        <section>
          <h2 className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 px-1">
            Tools
          </h2>
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={onOpenRules}
              className="w-full flex items-center justify-between py-3 px-4 border-b border-border text-left hover:bg-surface-light transition-colors"
            >
              <div className="flex items-center gap-3">
                <Wand2 size={18} className="text-text-secondary" />
                <span className="text-sm text-text-primary">Auto-categorization rules</span>
              </div>
              <ChevronRight size={16} className="text-text-secondary" />
            </button>
            <button
              type="button"
              onClick={onOpenTaxCalculator}
              className="w-full flex items-center justify-between py-3 px-4 text-left hover:bg-surface-light transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calculator size={18} className="text-text-secondary" />
                <span className="text-sm text-text-primary">PH Tax Calculator</span>
              </div>
              <ChevronRight size={16} className="text-text-secondary" />
            </button>
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

        <SyncSettingsSection />
      </div>
    </div>
  );
}
