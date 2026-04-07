import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CURRENCIES } from '../utils/currencies';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories';
import type { FinanceCategoryDef } from '../utils/categories';
import type { Account, Budget } from '../types';

interface TransactionFormProps {
  type: 'income' | 'expense';
  defaultCurrency: string;
  accounts?: Account[];
  customBudgets?: Budget[];
  onSave: (txn: {
    type: 'income' | 'expense';
    amount: number;
    currency: string;
    category: string;
    description: string;
    date: string;
    accountId?: string;
    budgetId?: string;
    isRecurring?: boolean;
    recurringDay?: number;
  }) => void;
  onCancel: () => void;
}

export default function TransactionForm({
  type,
  defaultCurrency,
  accounts,
  customBudgets,
  onSave,
  onCancel,
}: TransactionFormProps) {
  const categories: FinanceCategoryDef[] =
    type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]?.value ?? 'other');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [budgetId, setBudgetId] = useState<string | undefined>(undefined);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState(() => new Date().getDate());
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const canSave = parsedAmount > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      type,
      amount: parsedAmount,
      currency,
      category,
      description: description.trim(),
      date,
      accountId,
      budgetId,
      isRecurring: isRecurring || undefined,
      recurringDay: isRecurring ? recurringDay : undefined,
    });
  };

  const isExpense = type === 'expense';
  const headerTint = isExpense
    ? 'bg-red-500/5 border-b border-red-500/10'
    : 'bg-green-500/5 border-b border-green-500/10';

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header bar */}
      <div className={`flex-shrink-0 ${headerTint}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-text-secondary active:opacity-60 transition-opacity"
          >
            Cancel
          </button>
          <h1 className="text-base font-semibold text-text-primary">
            {isExpense ? 'Add Expense' : 'Add Income'}
          </h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={`text-sm font-semibold transition-opacity ${
              canSave
                ? 'text-primary active:opacity-60'
                : 'text-primary opacity-50 cursor-not-allowed'
            }`}
          >
            Save
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Amount section */}
        <div className="flex flex-col items-center py-8 px-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-3">
            Amount
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Transaction amount"
            className="w-full text-4xl font-bold text-text-primary text-center bg-transparent border-none outline-none placeholder:text-text-secondary/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            autoFocus
          />

          {/* Currency selector */}
          <div className="relative mt-4">
            <button
              type="button"
              onClick={() => setShowCurrencyDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light rounded-lg border border-border text-sm text-text-primary transition-all hover:bg-surface-lighter"
            >
              <span>
                {CURRENCIES[currency]?.symbol ?? ''} {currency}
              </span>
              <ChevronDown size={14} className="text-text-secondary" />
            </button>

            {showCurrencyDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowCurrencyDropdown(false)}
                />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 bg-surface border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto min-w-[180px]">
                  {Object.entries(CURRENCIES).map(([code, config]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setCurrency(code);
                        setShowCurrencyDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        currency === code
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-text-primary hover:bg-surface-light'
                      }`}
                    >
                      {config.symbol} {code}{' '}
                      <span className="text-text-secondary text-xs">
                        {config.name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-4 space-y-6 pb-8">
          {/* Description field */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Description
            </label>
            <input
              type="text"
              placeholder={
                isExpense ? 'What did you spend on?' : 'Where did this come from?'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Transaction description"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          {/* Category selection */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Category
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

          {/* Date field */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Transaction date"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          {/* Account selector */}
          {accounts && accounts.length > 0 && (
            <div>
              <div className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">
                ACCOUNT (OPTIONAL)
              </div>
              <select
                value={accountId ?? ''}
                onChange={(e) => setAccountId(e.target.value || undefined)}
                className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary appearance-none"
              >
                <option value="">None</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Budget selector (expense only, custom budgets) */}
          {type === 'expense' && customBudgets && customBudgets.length > 0 && (
            <div>
              <div className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">
                BUDGET (OPTIONAL)
              </div>
              <select
                value={budgetId ?? ''}
                onChange={(e) => setBudgetId(e.target.value || undefined)}
                className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary appearance-none"
              >
                <option value="">None</option>
                {customBudgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Repeat monthly toggle */}
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-text-primary">Repeat monthly</div>
              <div className="text-xs text-text-secondary">This transaction repeats every month</div>
            </div>
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isRecurring ? 'bg-primary' : 'bg-border'
              }`}
              role="switch"
              aria-checked={isRecurring}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  isRecurring ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Day of month (when recurring) */}
          {isRecurring && (
            <div>
              <div className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">DAY OF MONTH</div>
              <input
                type="number"
                min={1}
                max={31}
                value={recurringDay}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v >= 1 && v <= 31) setRecurringDay(v);
                }}
                aria-label="Day of month for recurring transaction"
                className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
