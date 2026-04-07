import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle, CreditCard } from 'lucide-react';
import type { Installment, Account } from '../types';
import { formatCurrency } from '../utils/currencies';

interface InstallmentListProps {
  installments: Installment[];
  accounts: Account[];
  onAdd: () => void;
  onEdit: (inst: Installment) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onBack: () => void;
}

function getEstimatedEndDate(startDate: string, totalMonths: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + totalMonths);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

function formatStartDate(startDate: string): string {
  return new Date(startDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
  });
}

function InstallmentCard({
  inst,
  accounts,
  onEdit,
  onDelete,
  onMarkPaid,
}: {
  inst: Installment;
  accounts: Account[];
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
}) {
  const isCompleted = inst.paidMonths >= inst.totalMonths;
  const progressPercent = Math.min(
    (inst.paidMonths / inst.totalMonths) * 100,
    100,
  );
  const remaining = (inst.totalMonths - inst.paidMonths) * inst.monthlyPayment;
  const creditCard = inst.creditCardAccountId
    ? accounts.find((a) => a.id === inst.creditCardAccountId)
    : undefined;

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-4 hover:bg-surface-hover active:scale-[0.99] transition-all">
      {/* Top row: name + completed badge */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-text-primary truncate">
          {inst.itemName}
        </p>
        {isCompleted && (
          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success">
            Completed
          </span>
        )}
      </div>

      {/* Credit card link */}
      {creditCard && (
        <div className="flex items-center gap-1 mb-2">
          <CreditCard className="w-3 h-3 text-text-secondary" />
          <span className="text-xs text-text-secondary">{creditCard.name}</span>
        </div>
      )}

      {/* Monthly payment */}
      <p className="text-base font-bold text-text-primary mb-2">
        {formatCurrency(inst.monthlyPayment, inst.currency)}/month
      </p>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-surface-lighter overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all ${isCompleted ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Progress text */}
      <p className="text-xs text-text-secondary mb-2">
        {inst.paidMonths} of {inst.totalMonths} months paid
      </p>

      {/* Remaining balance */}
      {!isCompleted && (
        <p className="text-xs text-text-tertiary mb-2">
          Remaining: {formatCurrency(remaining, inst.currency)}
        </p>
      )}

      {/* Dates */}
      <p className="text-[11px] text-text-tertiary mb-3">
        {formatStartDate(inst.startDate)} &mdash;{' '}
        {getEstimatedEndDate(inst.startDate, inst.totalMonths)}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {!isCompleted && (
          <button
            type="button"
            onClick={onMarkPaid}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"
            aria-label={`Mark paid for ${inst.itemName}`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Mark Paid
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-light transition-colors"
          aria-label={`Edit ${inst.itemName}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-surface-light transition-colors"
          aria-label={`Delete ${inst.itemName}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function InstallmentList({
  installments,
  accounts,
  onAdd,
  onEdit,
  onDelete,
  onMarkPaid,
  onBack,
}: InstallmentListProps) {
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
          Installments
        </h1>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Empty state */}
      {installments.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-secondary font-medium">No installments</p>
          <p className="text-sm text-text-tertiary mt-1">
            Tap &ldquo;Add&rdquo; to start tracking an installment plan.
          </p>
        </div>
      )}

      {/* Installment cards */}
      {installments.length > 0 && (
        <div className="flex flex-col gap-3">
          {installments.map((inst) => (
            <InstallmentCard
              key={inst.id}
              inst={inst}
              accounts={accounts}
              onEdit={() => onEdit(inst)}
              onDelete={() => onDelete(inst.id)}
              onMarkPaid={() => onMarkPaid(inst.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
