import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Transaction } from '../types';
import type { BudgetWithSpending } from '../hooks/useBudgets';
import { formatCurrency } from '../utils/currencies';
import { parseAmountInput } from '../utils/amountParser';
import { monthKey } from '../utils/commitmentBudgets';
import { todayISO, formatDisplayDate } from '../utils/dates';
import LogoBadge from './ui/LogoBadge';
import { getBudgetPreset } from '../utils/budgetPresets';

interface ConfirmBillDialogProps {
  budget: BudgetWithSpending;
  accounts: { id: string; name: string }[];
  onConfirm: (txn: Omit<Transaction, 'id' | 'createdAt'>, newLastConfirmedMonth: string) => Promise<void> | void;
  onSkip: () => void;
  onClose: () => void;
}

export default function ConfirmBillDialog({
  budget,
  accounts,
  onConfirm,
  onSkip,
  onClose,
}: ConfirmBillDialogProps) {
  const [amount, setAmount] = useState<string>(String(budget.monthlyLimit));
  const [date, setDate] = useState<string>(budget.nextDueDate ?? todayISO());
  const [accountId, setAccountId] = useState<string | undefined>(budget.sourceAccountId);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAmount(String(budget.monthlyLimit));
    setDate(budget.nextDueDate ?? todayISO());
    setAccountId(budget.sourceAccountId);
  }, [budget.id, budget.monthlyLimit, budget.nextDueDate, budget.sourceAccountId]);

  const parsed = parseAmountInput(amount);
  const canSubmit = parsed > 0 && date.length === 10 && !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await onConfirm(
      {
        type: 'expense',
        amount: parsed,
        currency: budget.currency,
        category: 'bills',
        description: budget.name,
        date,
        budgetId: budget.id,
        accountId,
      },
      monthKey(date)
    );
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div
        className="bg-bg w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border p-5 max-h-[90dvh] overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center text-text-secondary"
          >
            <X size={20} />
          </button>
          <h2 className="text-base font-semibold text-text-primary">Confirm bill</h2>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-text-secondary px-2"
          >
            Skip
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <LogoBadge
            logo={budget.preset ? getBudgetPreset(budget.preset)?.logo : undefined}
            name={budget.name}
            color={budget.color}
            size="md"
          />
          <div>
            <p className="text-sm font-semibold text-text-primary">{budget.name}</p>
            <p className="text-xs text-text-secondary">
              Due {budget.nextDueDate ? formatDisplayDate(budget.nextDueDate) : '—'} · estimated {formatCurrency(budget.monthlyLimit, budget.currency)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Actual Amount
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Actual bill amount"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Date Paid
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Date paid"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
            />
          </div>

          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Source Account
            </label>
            <select
              value={accountId ?? ''}
              onChange={(e) => setAccountId(e.target.value || undefined)}
              aria-label="Source account"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
            >
              <option value="">None</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit}
          className={`w-full mt-5 rounded-2xl py-3.5 font-semibold text-sm transition-all ${
            canSubmit
              ? 'bg-primary text-white active:opacity-80'
              : 'bg-primary/40 text-white/50 cursor-not-allowed'
          }`}
        >
          Confirm &amp; save
        </button>
      </div>
    </div>
  );
}
