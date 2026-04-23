import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { CURRENCIES } from '../utils/currencies';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories';
import { parseAmountInput, isKNotation, validateAmountInput, amountErrorMessage } from '../utils/amountParser';
import { matchRule } from '../utils/rules';
import { useRules } from '../hooks/useRules';
import InlineAlert from './ui/InlineAlert';
import ReceiptScanner from './ReceiptScanner';
import type { ScanResult } from './ReceiptScanner';
import type { FinanceCategoryDef } from '../utils/categories';
import type { Account, Budget, Transaction, RecurringFrequency } from '../types';

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface QuickAddData {
  description: string;
  amount: number;
  category: string;
}

interface TransactionFormProps {
  type: 'income' | 'expense';
  defaultCurrency: string;
  accounts?: Account[];
  customBudgets?: Budget[];
  editingTransaction?: Transaction;
  quickAddData?: QuickAddData;
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
    recurringFrequency?: RecurringFrequency;
    recurringDay?: number;
    recurringDayOfWeek?: number;
    recurringMonth?: number;
    recurringCustomDates?: string[];
    recurringEndDate?: string;
  }) => void;
  onCancel: () => void;
}

export default function TransactionForm({
  type,
  defaultCurrency,
  accounts,
  customBudgets,
  editingTransaction,
  quickAddData,
  onSave,
  onCancel,
}: TransactionFormProps) {
  useEscapeKey(onCancel);

  const categories: FinanceCategoryDef[] =
    type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const [amount, setAmount] = useState(editingTransaction ? String(editingTransaction.amount) : quickAddData ? String(quickAddData.amount) : '');
  const [currency, setCurrency] = useState(editingTransaction?.currency ?? defaultCurrency);
  const [description, setDescription] = useState(editingTransaction?.description ?? quickAddData?.description ?? '');
  const [category, setCategory] = useState(editingTransaction?.category ?? quickAddData?.category ?? categories[0]?.value ?? 'other');
  const [date, setDate] = useState(editingTransaction?.date ?? (() => new Date().toISOString().split('T')[0] ?? ''));
  const [accountId, setAccountId] = useState<string | undefined>(editingTransaction?.accountId);
  const [budgetId, setBudgetId] = useState<string | undefined>(editingTransaction?.budgetId);
  const [isRecurring, setIsRecurring] = useState(editingTransaction?.isRecurring ?? false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>(editingTransaction?.recurringFrequency ?? 'monthly');
  const [recurringDay, setRecurringDay] = useState(editingTransaction?.recurringDay ?? (() => new Date().getDate()));
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState(editingTransaction?.recurringDayOfWeek ?? (() => new Date().getDay()));
  const [recurringMonth, setRecurringMonth] = useState(editingTransaction?.recurringMonth ?? (() => new Date().getMonth() + 1));
  const [recurringCustomDates, setRecurringCustomDates] = useState<string[]>(editingTransaction?.recurringCustomDates ?? []);
  const [customDateInput, setCustomDateInput] = useState('');
  const [recurringEndDate, setRecurringEndDate] = useState<string | undefined>(editingTransaction?.recurringEndDate);
  const [repeatsForever, setRepeatsForever] = useState(!editingTransaction?.recurringEndDate);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [categoryManuallySet, setCategoryManuallySet] = useState(!!editingTransaction || !!quickAddData?.category);
  const recurringOptionsRef = useRef<HTMLDivElement>(null);
  const dismissValidation = useCallback(() => setValidationError(null), []);
  const isEditing = !!editingTransaction;
  const { rules } = useRules();

  // Auto-pick category from user rules while description changes, but only
  // until the user manually overrides — then leave their choice alone.
  useEffect(() => {
    if (categoryManuallySet) return;
    const match = matchRule(description, type, accountId, rules);
    if (!match) return;
    if (!categories.some((c) => c.value === match.category)) return;
    if (match.category !== category) setCategory(match.category);
  }, [description, type, accountId, rules, categoryManuallySet, category, categories]);

  const handleScanApply = useCallback((result: ScanResult) => {
    if (result.amount) setAmount(result.amount);
    if (result.description) setDescription(result.description);
    if (result.date) setDate(result.date);
    if (result.category) {
      const validCat = categories.find((c) => c.value === result.category);
      if (validCat) {
        setCategory(validCat.value);
        setCategoryManuallySet(true);
      }
    }
  }, [categories]);

  const parsedAmount = parseAmountInput(amount);

  const handleSave = () => {
    const result = validateAmountInput(amount);
    if (!result.ok) {
      setValidationError(amountErrorMessage(result.reason));
      return;
    }
    setValidationError(null);
    const freq = isRecurring ? recurringFrequency : undefined;
    onSave({
      type,
      amount: result.value,
      currency,
      category,
      description: description.trim(),
      date,
      accountId,
      budgetId,
      isRecurring: isRecurring || undefined,
      recurringFrequency: freq,
      recurringDay: isRecurring && (freq === 'monthly' || freq === 'quarterly' || freq === 'yearly') ? recurringDay : undefined,
      recurringDayOfWeek: isRecurring && (freq === 'weekly' || freq === 'biweekly') ? recurringDayOfWeek : undefined,
      recurringMonth: isRecurring && freq === 'yearly' ? recurringMonth : undefined,
      recurringCustomDates: isRecurring && freq === 'custom' && recurringCustomDates.length > 0 ? recurringCustomDates : undefined,
      recurringEndDate: isRecurring && !repeatsForever ? recurringEndDate : undefined,
    });
  };

  const isExpense = type === 'expense';
  const headerTint = isExpense
    ? 'bg-red-500/5 border-b border-red-500/10'
    : 'bg-green-500/5 border-b border-green-500/10';

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header bar */}
      <div className={`flex-shrink-0 ${headerTint}`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-center px-4 py-3">
          <h1 className="text-base font-semibold text-text-primary">
            {isEditing ? (isExpense ? 'Edit Expense' : 'Edit Income') : (isExpense ? 'Add Expense' : 'Add Income')}
          </h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full">
        {/* Amount section */}
        <div className="flex flex-col items-center py-8 px-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-3">
            Amount
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
            aria-label="Transaction amount"
            className="w-full text-7xl md:text-8xl lg:text-9xl font-bold text-text-primary text-center bg-transparent border-none outline-none placeholder:text-text-secondary/30 tracking-tight"
            autoFocus
          />
          {isKNotation(amount) && (
            <p className="text-[11px] text-primary/70 mt-1">= {parsedAmount.toLocaleString()}</p>
          )}

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
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 bg-surface border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto min-w-[160px] sm:min-w-[180px]">
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

        <div className="px-4 space-y-6 pb-4">
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
                  onClick={() => { setCategory(cat.value); setCategoryManuallySet(true); }}
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

          {/* Receipt Scanner — expenses only */}
          {isExpense && (
            <ReceiptScanner
              onApply={handleScanApply}
              showPhoto={false}
            />
          )}

          {/* Account selector */}
          {accounts && accounts.length > 0 && (
            <div>
              <div className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">
                ACCOUNT (OPTIONAL)
              </div>
              <select
                value={accountId ?? ''}
                onChange={(e) => setAccountId(e.target.value || undefined)}
                className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary appearance-none select-chevron"
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
                className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary appearance-none select-chevron"
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

          {/* Recurring toggle */}
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-text-primary">Recurring</div>
              <div className="text-xs text-text-secondary">This transaction repeats</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !isRecurring;
                setIsRecurring(next);
                if (next) {
                  setTimeout(() => recurringOptionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }
              }}
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

          {isRecurring && (
            <div ref={recurringOptionsRef} className="space-y-4">
              {/* Frequency picker */}
              <div>
                <div className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">FREQUENCY</div>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRecurringFrequency(opt.value)}
                      className={`px-3 py-1.5 rounded-xl text-sm transition-all ${
                        recurringFrequency === opt.value
                          ? 'bg-primary text-white font-medium'
                          : 'bg-surface-light border border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of week (weekly / biweekly) */}
              {(recurringFrequency === 'weekly' || recurringFrequency === 'biweekly') && (
                <div>
                  <div className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">DAY OF WEEK</div>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRecurringDayOfWeek(i)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                          recurringDayOfWeek === i
                            ? 'bg-primary text-white'
                            : 'bg-surface-light border border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day of month (monthly / quarterly) */}
              {(recurringFrequency === 'monthly' || recurringFrequency === 'quarterly') && (
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

              {/* Month + Day (yearly) */}
              {recurringFrequency === 'yearly' && (
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">MONTH</div>
                    <div className="flex flex-wrap gap-1.5">
                      {MONTH_LABELS.map((label, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRecurringMonth(i + 1)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            recurringMonth === i + 1
                              ? 'bg-primary text-white'
                              : 'bg-surface-light border border-border text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">DAY</div>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={recurringDay}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (v >= 1 && v <= 31) setRecurringDay(v);
                      }}
                      aria-label="Day of month"
                      className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              )}

              {/* Custom dates */}
              {recurringFrequency === 'custom' && (
                <div>
                  <div className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">DATES</div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="date"
                      value={customDateInput}
                      onChange={(e) => setCustomDateInput(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-xl py-2.5 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customDateInput && !recurringCustomDates.includes(customDateInput)) {
                          setRecurringCustomDates([...recurringCustomDates, customDateInput].sort());
                          setCustomDateInput('');
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-white transition-all active:opacity-80"
                    >
                      Add
                    </button>
                  </div>
                  {recurringCustomDates.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {recurringCustomDates.map((d) => (
                        <span key={d} className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-light border border-border rounded-lg text-xs text-text-primary">
                          {d}
                          <button
                            type="button"
                            onClick={() => setRecurringCustomDates(recurringCustomDates.filter((x) => x !== d))}
                            className="text-text-secondary hover:text-danger transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* End date — not applicable for custom frequency (dates are explicit) */}
              {recurringFrequency !== 'custom' && (
                <div>
                  <div className="flex items-center justify-between py-2">
                    <div className="text-sm text-text-primary">Repeats forever</div>
                    <button
                      type="button"
                      onClick={() => {
                        setRepeatsForever(!repeatsForever);
                        if (!repeatsForever) setRecurringEndDate(undefined);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        repeatsForever ? 'bg-primary' : 'bg-border'
                      }`}
                      role="switch"
                      aria-checked={repeatsForever}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          repeatsForever ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {!repeatsForever && (
                    <input
                      type="date"
                      value={recurringEndDate ?? ''}
                      onChange={(e) => setRecurringEndDate(e.target.value || undefined)}
                      aria-label="Recurring end date"
                      className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all mt-2"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Sticky Save Footer */}
      <div
        className="flex-shrink-0 px-4 pt-3 pb-3 border-t border-border/30 bg-bg"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="max-w-2xl mx-auto w-full">
          {validationError && (
            <div className="mb-3">
              <InlineAlert
                message={validationError}
                onDismiss={dismissValidation}
                autoDismissMs={5000}
              />
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-2xl py-3.5 font-semibold text-sm transition-all bg-surface-light text-text-secondary active:opacity-80 border border-border/30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`flex-[2] rounded-2xl py-3.5 font-semibold text-sm transition-all ${
                parsedAmount > 0
                  ? 'bg-primary text-white active:opacity-80'
                  : 'bg-primary/60 text-white active:opacity-80'
              }`}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
