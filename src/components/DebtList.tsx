import { useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import type { DebtEntry } from '../types';
import { formatCurrency } from '../utils/currencies';

interface DebtListProps {
  debts: DebtEntry[];
  onAdd: () => void;
  onEdit: (debt: DebtEntry) => void;
  onDelete: (id: string) => void;
  onRecordPayment: (id: string, amount: number) => void;
  onBack: () => void;
}

type FilterValue = 'all' | 'i_owe' | 'owed_to_me';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return due < today;
}

function DebtCard({
  debt,
  onEdit,
  onDelete,
  onRecordPayment,
}: {
  debt: DebtEntry;
  onEdit: () => void;
  onDelete: () => void;
  onRecordPayment: (amount: number) => void;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const remaining = debt.amount - debt.paidAmount;
  const progressPercent = debt.amount > 0 ? Math.min((debt.paidAmount / debt.amount) * 100, 100) : 0;
  const isIOwe = debt.direction === 'i_owe';
  const overdue = isOverdue(debt.dueDate);

  const handleSubmitPayment = () => {
    const parsed = parseFloat(paymentAmount);
    if (parsed > 0) {
      onRecordPayment(parsed);
      setPaymentAmount('');
      setShowPayment(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-4 hover:bg-surface-hover active:scale-[0.99] transition-all">
      <div className="flex items-start gap-3">
        {/* Avatar circle */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white ${
            isIOwe ? 'bg-red-500/80' : 'bg-emerald-500/80'
          }`}
        >
          {getInitials(debt.personName)}
        </div>

        {/* Middle content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {debt.personName}
          </p>

          {/* Direction badge */}
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
              isIOwe
                ? 'bg-danger/10 text-danger'
                : 'bg-success/10 text-success'
            }`}
          >
            {isIOwe ? 'I owe' : 'Owed to me'}
          </span>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 rounded-full bg-surface-lighter overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Amount info */}
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-text-secondary">
              {formatCurrency(debt.paidAmount, debt.currency)} paid /{' '}
              {formatCurrency(debt.amount, debt.currency)} total
            </p>
            <p className="text-xs font-medium text-text-primary">
              {formatCurrency(remaining, debt.currency)} remaining
            </p>
          </div>

          {/* Overdue badge */}
          {overdue && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-danger/10 text-danger">
              Overdue
            </span>
          )}

          {/* Notes preview */}
          {debt.notes && (
            <p className="text-xs text-text-secondary mt-1.5 truncate">
              {debt.notes}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowPayment((prev) => !prev)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-success hover:bg-surface-light transition-colors"
            aria-label={`Record payment for ${debt.personName}`}
          >
            <DollarSign className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
            aria-label={`Edit debt for ${debt.personName}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-surface-light transition-colors"
            aria-label={`Delete debt for ${debt.personName}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick payment input */}
      {showPayment && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            aria-label="Payment amount"
            className="flex-1 bg-surface-light border border-border rounded-xl py-2 px-3 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={handleSubmitPayment}
            disabled={!(parseFloat(paymentAmount) > 0)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              parseFloat(paymentAmount) > 0
                ? 'bg-primary text-white active:opacity-80'
                : 'bg-primary/40 text-white/50 cursor-not-allowed'
            }`}
          >
            Record
          </button>
        </div>
      )}
    </div>
  );
}

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'I Owe', value: 'i_owe' },
  { label: 'Owed to Me', value: 'owed_to_me' },
];

export default function DebtList({
  debts,
  onAdd,
  onEdit,
  onDelete,
  onRecordPayment,
  onBack,
}: DebtListProps) {
  const [filter, setFilter] = useState<FilterValue>('all');

  const filtered =
    filter === 'all'
      ? debts
      : debts.filter((d) => d.direction === filter);

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl hover:bg-surface-light transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h1 className="text-xl font-bold text-text-primary flex-1" data-heading>
          Debts
        </h1>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-xl text-sm transition-all ${
              filter === opt.value
                ? 'bg-primary text-white font-medium'
                : 'bg-surface-light border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Debt cards */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onEdit={() => onEdit(debt)}
              onDelete={() => onDelete(debt.id)}
              onRecordPayment={(amount) => onRecordPayment(debt.id, amount)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-text-secondary font-medium">No debts tracked</p>
          <p className="text-sm text-text-secondary mt-1">
            Tap &ldquo;+ Add&rdquo; to start tracking who owes what.
          </p>
        </div>
      )}
    </div>
  );
}
