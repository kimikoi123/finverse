import { useState, useMemo } from 'react';
import { ArrowLeft, Pencil, Trash2, RefreshCw, CalendarDays } from 'lucide-react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currencies';
import { getFinanceCategoryDef } from '../utils/categories';
import { getNextRecurringDate, formatRecurringLabel } from '../utils/forecast';
import ConfirmDialog from './ui/ConfirmDialog';

interface PlannedPaymentsProps {
  transactions: Transaction[];
  onEdit: (txn: Transaction) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

function isoToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatISODate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y!, m! - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysFromNow(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y!, m! - 1, d!);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

type FilterValue = 'all' | 'recurring' | 'scheduled';

export default function PlannedPayments({
  transactions,
  onEdit,
  onDelete,
  onBack,
}: PlannedPaymentsProps) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const today = isoToday();

  const { recurring, scheduled } = useMemo(() => {
    const rec: (Transaction & { nextDate: Date })[] = [];
    const sched: Transaction[] = [];

    for (const t of transactions) {
      if (t.isRecurring) {
        const next = getNextRecurringDate(t);
        if (next) rec.push({ ...t, nextDate: next });
      } else if (t.date > today) {
        sched.push(t);
      }
    }

    rec.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
    sched.sort((a, b) => a.date.localeCompare(b.date));

    return { recurring: rec, scheduled: sched };
  }, [transactions, today]);

  const totalCount = recurring.length + scheduled.length;
  const isEmpty = totalCount === 0;
  const showFilters = recurring.length > 0 && scheduled.length > 0;
  const showRecurring = activeFilter === 'all' || activeFilter === 'recurring';
  const showScheduled = activeFilter === 'all' || activeFilter === 'scheduled';

  const filters: { value: FilterValue; label: string }[] = [
    { value: 'all', label: `All (${totalCount})` },
    { value: 'recurring', label: `Recurring (${recurring.length})` },
    { value: 'scheduled', label: `Scheduled (${scheduled.length})` },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface border border-border hover:bg-surface-hover active:scale-[0.98] transition-all shrink-0"
        >
          <ArrowLeft size={18} className="text-text-primary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary" data-heading>
            Planned Payments
          </h1>
          <p className="text-xs text-text-secondary">
            Recurring and upcoming scheduled transactions
          </p>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">📋</span>
            <h2 className="text-xl font-bold text-text-primary" data-heading>
              No planned payments
            </h2>
            <p className="text-sm text-text-secondary max-w-xs">
              Mark transactions as "Repeat monthly" or create transactions with a future date to see them here
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Filter pills */}
          {showFilters && (
            <div className="flex gap-2 mb-5 overflow-x-auto">
              {filters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setActiveFilter(f.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
                    activeFilter === f.value
                      ? 'bg-primary text-white'
                      : 'bg-surface-light text-text-secondary border border-border'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Recurring section */}
          {showRecurring && recurring.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw size={14} className="text-primary" />
                <h2 className="text-xs font-semibold text-text-secondary tracking-wider uppercase">
                  Recurring ({recurring.length})
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {recurring.map((txn) => {
                  const catDef = getFinanceCategoryDef(txn.category);
                  const isExpense = txn.type === 'expense';
                  return (
                    <div
                      key={txn.id}
                      className="bg-surface rounded-2xl border border-border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                            isExpense ? 'bg-danger/10' : 'bg-success/10'
                          }`}
                        >
                          {catDef.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {txn.description || catDef.label}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-text-secondary">
                              {formatRecurringLabel(txn)}
                            </span>
                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-semibold">
                              RECURRING
                            </span>
                          </div>
                        </div>
                        <p
                          className={`text-sm font-semibold shrink-0 ${
                            isExpense ? 'text-danger' : 'text-success'
                          }`}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {isExpense ? '-' : '+'}{formatCurrency(txn.amount, txn.currency)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
                        <div className="text-xs text-text-secondary">
                          <span>Next: {formatDate(txn.nextDate)}</span>
                          {txn.recurringEndDate && (
                            <span className="ml-2 text-text-secondary/60">Ends: {formatISODate(txn.recurringEndDate)}</span>
                          )}
                        </div>
                        <div className="flex gap-0.5 -my-1.5 -mr-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(txn)}
                            aria-label="Edit planned payment"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors"
                          >
                            <Pencil size={14} className="text-text-secondary" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(txn)}
                            aria-label="Delete planned payment"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 size={14} className="text-danger" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scheduled (future one-time) section */}
          {showScheduled && scheduled.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={14} className="text-primary" />
                <h2 className="text-xs font-semibold text-text-secondary tracking-wider uppercase">
                  Scheduled ({scheduled.length})
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {scheduled.map((txn) => {
                  const catDef = getFinanceCategoryDef(txn.category);
                  const isExpense = txn.type === 'expense';
                  const days = daysFromNow(txn.date);
                  return (
                    <div
                      key={txn.id}
                      className="bg-surface rounded-2xl border border-border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                            isExpense ? 'bg-danger/10' : 'bg-success/10'
                          }`}
                        >
                          {catDef.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {txn.description || catDef.label}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-text-secondary">
                              {formatISODate(txn.date)}
                            </span>
                            {days <= 3 ? (
                              <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-md font-semibold">
                                {days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `${days} DAYS`}
                              </span>
                            ) : (
                              <span className="text-[9px] bg-surface-lighter text-text-secondary px-1.5 py-0.5 rounded-md font-semibold">
                                ONE-TIME
                              </span>
                            )}
                          </div>
                        </div>
                        <p
                          className={`text-sm font-semibold shrink-0 ${
                            isExpense ? 'text-danger' : 'text-success'
                          }`}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {isExpense ? '-' : '+'}{formatCurrency(txn.amount, txn.currency)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
                        <p className="text-xs text-text-secondary">
                          {days === 0 ? 'Due today' : `In ${days} day${days !== 1 ? 's' : ''}`}
                        </p>
                        <div className="flex gap-0.5 -my-1.5 -mr-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(txn)}
                            aria-label="Edit scheduled payment"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors"
                          >
                            <Pencil size={14} className="text-text-secondary" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(txn)}
                            aria-label="Delete scheduled payment"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 size={14} className="text-danger" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete "${pendingDelete.description || getFinanceCategoryDef(pendingDelete.category).label}"?`}
          onConfirm={() => { onDelete(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
