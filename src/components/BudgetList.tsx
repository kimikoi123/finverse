import { useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import type { Budget } from '../types';
import type { BudgetWithSpending } from '../hooks/useBudgets';
import { formatCurrency } from '../utils/currencies';
import { getBudgetPreset } from '../utils/budgetPresets';
import { monthKey } from '../utils/commitmentBudgets';
import ConfirmDialog from './ui/ConfirmDialog';
import LogoBadge from './ui/LogoBadge';

interface BudgetListProps {
  budgets: BudgetWithSpending[];
  onCreateCategory: () => void;
  onCreateCustom: () => void;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
  onConfirmBill: (budget: BudgetWithSpending) => void;  // NEW
  onBack: () => void;
}

function getBarColor(percentage: number): string {
  if (percentage > 100) return 'bg-danger';
  if (percentage >= 80) return 'bg-amber-500';
  return 'bg-primary';
}

function formatISOShort(iso: string | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CommitmentCard({
  budget,
  onEdit,
  onDelete,
  onConfirm,
}: {
  budget: BudgetWithSpending;
  onEdit: () => void;
  onDelete: () => void;
  onConfirm: () => void;
}) {
  const confirmedThisMonth =
    budget.lastConfirmedMonth === monthKey(new Date());
  const isPending = budget.isPendingThisMonth === true;

  const secondary: { text: string; pill?: { label: string; tone: 'amber' | 'success' } } = (() => {
    if (isPending) {
      return { text: 'Due today · tap to confirm', pill: { label: 'PENDING', tone: 'amber' } };
    }
    if (confirmedThisMonth) {
      return {
        text: `Paid ${formatCurrency(budget.spent, budget.currency)} · next ${formatISOShort(budget.nextDueDate)}`,
        pill: { label: 'PAID', tone: 'success' },
      };
    }
    if (budget.varies === false) {
      return { text: `Next: ${formatISOShort(budget.nextDueDate)} · auto-posts ${formatCurrency(budget.monthlyLimit, budget.currency)}` };
    }
    return { text: `Next: ${formatISOShort(budget.nextDueDate)} · est. ${formatCurrency(budget.monthlyLimit, budget.currency)}` };
  })();

  const pillClass =
    secondary.pill?.tone === 'amber'
      ? 'bg-amber-500/15 text-amber-600'
      : 'bg-success/15 text-success';

  return (
    <button
      type="button"
      onClick={isPending ? onConfirm : undefined}
      disabled={!isPending}
      className={`bg-surface rounded-2xl border border-white/[0.06] p-4 flex items-start gap-3 text-left transition-all ${
        isPending ? 'hover:bg-surface-hover active:scale-[0.98] cursor-pointer' : 'cursor-default'
      }`}
    >
      {budget.type === 'category' ? (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm"
          style={{ backgroundColor: budget.color }}
        >
          {budget.icon}
        </div>
      ) : (
        <LogoBadge
          logo={budget.preset ? getBudgetPreset(budget.preset)?.logo : undefined}
          name={budget.name}
          color={budget.color}
          size="md"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-text-primary truncate">{budget.name}</p>
          {secondary.pill && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${pillClass}`}>
              {secondary.pill.label}
            </span>
          )}
        </div>
        <p className="text-xs text-text-secondary mt-0.5">{secondary.text}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-light transition-colors"
          aria-label={`Edit ${budget.name}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-surface-light transition-colors"
          aria-label={`Delete ${budget.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </button>
  );
}

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: BudgetWithSpending;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fillWidth = Math.min(budget.percentage, 100);

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-4 flex items-start gap-3 hover:bg-surface-hover active:scale-[0.98] transition-all">
      {/* Icon circle */}
      {budget.type === 'category' ? (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm"
          style={{ backgroundColor: budget.color }}
        >
          {budget.icon}
        </div>
      ) : (
        <LogoBadge
          logo={budget.preset ? getBudgetPreset(budget.preset)?.logo : undefined}
          name={budget.name}
          color={budget.color}
          size="md"
        />
      )}

      {/* Middle content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">
          {budget.name}
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          {formatCurrency(budget.spent, budget.currency)} /{' '}
          {formatCurrency(budget.monthlyLimit, budget.currency)}
        </p>
        <p className="text-[11px] text-text-tertiary mt-0.5">
          {formatCurrency(budget.remaining, budget.currency)} left this month
        </p>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-surface-lighter overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getBarColor(budget.percentage)}`}
            style={{ width: `${fillWidth}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-light transition-colors"
          aria-label={`Edit ${budget.name}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-surface-light transition-colors"
          aria-label={`Delete ${budget.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function BudgetList({
  budgets,
  onCreateCategory,
  onCreateCustom,
  onEdit,
  onDelete,
  onConfirmBill,
  onBack,
}: BudgetListProps) {
  const [pendingDelete, setPendingDelete] = useState<BudgetWithSpending | null>(null);
  const commitmentBudgets = budgets.filter((b) => b.isCommitment === true);
  const flexibleCustomBudgets = budgets.filter((b) => b.type === 'custom' && b.isCommitment !== true);
  const categoryBudgets = budgets.filter((b) => b.type === 'category' && b.isCommitment !== true);
  const hasNoBudgets = budgets.length === 0;

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-surface-light transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h1 className="text-xl font-bold text-text-primary" data-heading>
          Category Budgets
        </h1>
      </div>

      {/* Empty state */}
      {hasNoBudgets && (
        <div className="text-center py-16">
          <p className="text-text-secondary font-medium">No budgets yet</p>
          <p className="text-sm text-text-tertiary mt-1">
            Create a category or custom budget to start tracking your spending.
          </p>
        </div>
      )}

      {/* Create Custom Card */}
      <button
        type="button"
        onClick={onCreateCustom}
        className="w-full bg-surface rounded-2xl border border-white/[0.06] p-4 flex items-center gap-3 text-left hover:bg-surface-light transition-colors mb-6"
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            Create a custom category
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">
            Add a budget for subscriptions, bills, or anything you want to track
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-text-tertiary shrink-0" />
      </button>

      {/* Commitments Section */}
      {commitmentBudgets.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-text-secondary mb-1">
            Commitments
          </h2>
          <p className="text-xs text-text-tertiary mb-3">
            Fixed and variable recurring bills. Variable bills need confirmation each month.
          </p>
          <div className="flex flex-col gap-2">
            {commitmentBudgets.map((budget) => (
              <CommitmentCard
                key={budget.id}
                budget={budget}
                onEdit={() => onEdit(budget)}
                onDelete={() => setPendingDelete(budget)}
                onConfirm={() => onConfirmBill(budget)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Flexible custom budgets Section */}
      {flexibleCustomBudgets.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-text-secondary mb-1">
            Your custom budgets
          </h2>
          <p className="text-xs text-text-tertiary mb-3">
            Edit or delete the extra categories you created for finer tracking.
          </p>
          <div className="flex flex-col gap-2">
            {flexibleCustomBudgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={() => onEdit(budget)}
                onDelete={() => setPendingDelete(budget)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Category Budgets Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-secondary">
            Built-in categories
          </h2>
          <button
            type="button"
            onClick={onCreateCategory}
            className="text-xs font-medium text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add category budget
          </button>
        </div>
        {categoryBudgets.length > 0 ? (
          <div className="flex flex-col gap-2">
            {categoryBudgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={() => onEdit(budget)}
                onDelete={() => setPendingDelete(budget)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 text-center">
            <p className="text-sm text-text-tertiary">
              No category budgets yet. Tap &ldquo;Add category budget&rdquo; to get started.
            </p>
          </div>
        )}
      </section>

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete ${pendingDelete.name}?`}
          onConfirm={() => { onDelete(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
