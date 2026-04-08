import { useState, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import { parseAmountInput, isKNotation } from '../utils/amountParser';
import type { Goal, Account } from '../types';
import { ACCOUNT_COLORS } from '../hooks/useAccounts';

interface GoalFormProps {
  accounts: Account[];
  onSave: (data: Omit<Goal, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  editingGoal?: Goal;
}

export default function GoalForm({
  accounts,
  onSave,
  onCancel,
  editingGoal,
}: GoalFormProps) {
  const isEditing = !!editingGoal;

  const [name, setName] = useState(editingGoal?.name ?? '');
  const [targetAmount, setTargetAmount] = useState(() =>
    editingGoal ? String(editingGoal.targetAmount) : ''
  );
  const [savedAmount, setSavedAmount] = useState(() =>
    editingGoal ? String(editingGoal.savedAmount) : ''
  );
  const [linkedAccountId, setLinkedAccountId] = useState(
    editingGoal?.linkedAccountId ?? ''
  );
  const [deadline, setDeadline] = useState(editingGoal?.deadline ?? '');
  const [selectedColor, setSelectedColor] = useState(
    () => editingGoal?.color ?? ACCOUNT_COLORS[0] ?? '#2d6a4f'
  );
  const [currency] = useState(editingGoal?.currency ?? 'PHP');

  const hasLinkedAccount = linkedAccountId.length > 0;

  const parsedTarget = parseAmountInput(targetAmount);
  const parsedSaved = parseAmountInput(savedAmount);

  const canSave = name.trim().length > 0 && parsedTarget > 0;

  const handleSave = useCallback(() => {
    if (!canSave) return;

    const data: Omit<Goal, 'id' | 'createdAt'> = {
      name: name.trim(),
      targetAmount: parsedTarget,
      savedAmount: hasLinkedAccount ? 0 : parsedSaved,
      linkedAccountId: hasLinkedAccount ? linkedAccountId : undefined,
      currency,
      deadline: deadline || undefined,
      color: selectedColor,
    };

    onSave(data);
  }, [
    canSave,
    name,
    parsedTarget,
    parsedSaved,
    hasLinkedAccount,
    linkedAccountId,
    currency,
    deadline,
    selectedColor,
    onSave,
  ]);

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header */}
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
            {isEditing ? 'Edit Goal' : 'Add Goal'}
          </h1>
          <div className="min-w-[44px]" />
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6 space-y-6 pb-4">
          {/* Goal Name */}
          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Goal Name
            </label>
            <input
              type="text"
              placeholder="e.g. Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Goal name"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
              autoFocus
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Target Amount
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              aria-label="Target amount"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-lg text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
            {isKNotation(targetAmount) && (
              <p className="text-[11px] text-primary/70 mt-1">= {parsedTarget.toLocaleString()}</p>
            )}
          </div>

          {/* Saved Amount — only when no linked account */}
          {!hasLinkedAccount && (
            <div>
              <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
                Saved Amount
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={savedAmount}
                onChange={(e) => setSavedAmount(e.target.value)}
                aria-label="Saved amount"
                className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
              />
              {isKNotation(savedAmount) && (
                <p className="text-[11px] text-primary/70 mt-1">= {parsedSaved.toLocaleString()}</p>
              )}
            </div>
          )}

          {/* Link to Account */}
          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Link to Account
            </label>
            <select
              value={linkedAccountId}
              onChange={(e) => setLinkedAccountId(e.target.value)}
              aria-label="Link to account"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all appearance-none"
            >
              <option value="">None</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Deadline (optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              aria-label="Deadline"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-3 block">
              Color
            </label>
            <div className="flex items-center gap-3">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  aria-label={`Select color ${c}`}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
                  style={{
                    backgroundColor: c,
                    boxShadow:
                      selectedColor === c
                        ? `0 0 0 3px var(--color-bg), 0 0 0 5px ${c}`
                        : 'none',
                  }}
                >
                  {selectedColor === c && (
                    <Check size={14} className="text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Save Footer */}
      <div
        className="flex-shrink-0 px-4 pt-3 pb-3 border-t border-border/30 bg-bg"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`w-full rounded-2xl py-3.5 font-semibold text-sm transition-all ${
            canSave
              ? 'bg-primary text-white active:opacity-80'
              : 'bg-primary/40 text-white/50 cursor-not-allowed'
          }`}
        >
          {isEditing ? 'Update Goal' : 'Save Goal'}
        </button>
      </div>
    </div>
  );
}
