import { ArrowLeft, Plus, Pencil, Trash2, Link } from 'lucide-react';
import type { Goal, Account } from '../types';
import { formatCurrency } from '../utils/currencies';

interface GoalListProps {
  goals: Goal[];
  accounts: Account[];
  onAdd: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

function GoalCard({
  goal,
  accounts,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  accounts: Account[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const linkedAccount = goal.linkedAccountId
    ? accounts.find((a) => a.id === goal.linkedAccountId)
    : undefined;

  const saved = linkedAccount ? linkedAccount.balance : goal.savedAmount;
  const percentage =
    goal.targetAmount > 0 ? (saved / goal.targetAmount) * 100 : 0;
  const fillWidth = Math.min(percentage, 100);

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-4 flex items-start gap-3 hover:bg-surface-hover active:scale-[0.99] transition-all">
      {/* Colored accent bar */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: goal.color }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">
          {goal.name}
        </p>

        {goal.deadline && (
          <p className="text-xs text-text-secondary mt-0.5">
            Deadline: {goal.deadline}
          </p>
        )}

        {linkedAccount && (
          <span className="inline-flex items-center gap-1 text-xs text-text-secondary mt-1 bg-surface-lighter rounded-md px-1.5 py-0.5">
            <Link className="w-3 h-3" />
            Linked to {linkedAccount.name}
          </span>
        )}

        {/* Progress bar */}
        <div className="mt-2 h-2 rounded-full bg-surface-lighter overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${fillWidth}%`,
              backgroundColor: goal.color,
            }}
          />
        </div>

        {/* Amounts */}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-text-secondary">
            {formatCurrency(saved, goal.currency)} /{' '}
            {formatCurrency(goal.targetAmount, goal.currency)}
          </p>
          <p className="text-xs text-text-secondary font-medium">
            {Math.round(percentage)}%
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-light transition-colors"
          aria-label={`Edit ${goal.name}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-surface-light transition-colors"
          aria-label={`Delete ${goal.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function GoalList({
  goals,
  accounts,
  onAdd,
  onEdit,
  onDelete,
  onBack,
}: GoalListProps) {
  const hasNoGoals = goals.length === 0;

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
        <h1
          className="text-xl font-bold text-text-primary flex-1"
          data-heading
        >
          Personal Goals
        </h1>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Empty state */}
      {hasNoGoals && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-text-secondary font-medium">No goals yet</p>
          <p className="text-sm text-text-tertiary mt-1">
            Set a savings goal and track your progress over time.
          </p>
        </div>
      )}

      {/* Goal cards */}
      {!hasNoGoals && (
        <div className="flex flex-col gap-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              accounts={accounts}
              onEdit={() => onEdit(goal)}
              onDelete={() => onDelete(goal.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
