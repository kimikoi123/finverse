import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories';
import InlineAlert from './ui/InlineAlert';
import type { Rule, Account } from '../types';

interface RuleFormProps {
  editingRule?: Rule;
  accounts: Account[];
  nextPriority: number;
  onSave: (data: Omit<Rule, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

type TypeFilter = 'any' | 'expense' | 'income';

export default function RuleForm({ editingRule, accounts, nextPriority, onSave, onCancel }: RuleFormProps) {
  useEscapeKey(onCancel);
  const isEditing = !!editingRule;

  const initialTypeFilter: TypeFilter = editingRule?.type ?? 'any';
  const [pattern, setPattern] = useState(editingRule?.pattern ?? '');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialTypeFilter);
  const [category, setCategory] = useState(
    editingRule?.category ?? (initialTypeFilter === 'income' ? INCOME_CATEGORIES[0]!.value : EXPENSE_CATEGORIES[0]!.value),
  );
  const [accountId, setAccountId] = useState<string>(editingRule?.accountId ?? '');
  const [priority, setPriority] = useState(editingRule?.priority ?? nextPriority);
  const [enabled, setEnabled] = useState(editingRule?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const dismissError = useCallback(() => setError(null), []);

  const categories = typeFilter === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const canSave = pattern.trim().length > 0 && category.length > 0;

  const handleSave = () => {
    const trimmed = pattern.trim();
    if (trimmed.length === 0) {
      setError('Enter a keyword or phrase to match.');
      return;
    }
    if (!categories.some((c) => c.value === category)) {
      setError('Pick a category from the list.');
      return;
    }
    setError(null);
    const data: Omit<Rule, 'id' | 'createdAt'> = {
      pattern: trimmed,
      category,
      priority,
      enabled,
      ...(typeFilter !== 'any' ? { type: typeFilter } : {}),
      ...(accountId ? { accountId } : {}),
    };
    onSave(data);
  };

  const handleTypeFilterChange = (next: TypeFilter) => {
    setTypeFilter(next);
    const nextCats = next === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!nextCats.some((c) => c.value === category)) {
      setCategory(nextCats[0]!.value);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      <div className="flex-shrink-0 border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-start text-text-secondary active:opacity-60 transition-opacity"
          >
            <X size={20} />
          </button>
          <h1 className="text-base font-semibold text-text-primary">
            {isEditing ? 'Edit Rule' : 'Add Rule'}
          </h1>
          <div className="min-w-[44px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6 space-y-6 pb-4 max-w-2xl mx-auto w-full">
          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              When description contains
            </label>
            <input
              type="text"
              placeholder="e.g. starbucks"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              aria-label="Rule pattern"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
              autoFocus
            />
            <p className="text-[11px] text-text-secondary/70 mt-1.5">Case-insensitive substring match.</p>
          </div>

          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Apply to
            </label>
            <div className="flex gap-2">
              {(['any', 'expense', 'income'] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleTypeFilterChange(val)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm transition-all capitalize ${
                    typeFilter === val
                      ? 'bg-primary text-white font-medium'
                      : 'bg-surface-light border border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {val === 'any' ? 'Any' : val}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Set category to
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-xl text-sm transition-all ${
                    category === cat.value
                      ? 'bg-primary text-white font-medium'
                      : 'bg-surface-light border border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
                Only for account (optional)
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                aria-label="Filter to account"
                className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all appearance-none select-chevron"
              >
                <option value="">Any account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Priority
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) setPriority(v);
              }}
              aria-label="Priority"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
            <p className="text-[11px] text-text-secondary/70 mt-1.5">Lower numbers win when multiple rules match the same description.</p>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-text-primary">Enabled</div>
              <div className="text-xs text-text-secondary">Disable to pause without deleting.</div>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              role="switch"
              aria-checked={enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex-shrink-0 px-4 pt-3 pb-3 border-t border-border/30 bg-bg"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        {error && (
          <div className="mb-3">
            <InlineAlert message={error} onDismiss={dismissError} autoDismissMs={5000} />
          </div>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`w-full rounded-2xl py-3.5 font-semibold text-sm transition-all ${
            canSave ? 'bg-primary text-white active:opacity-80' : 'bg-primary/40 text-white/50 cursor-not-allowed'
          }`}
        >
          {isEditing ? 'Update Rule' : 'Save Rule'}
        </button>
      </div>
    </div>
  );
}
