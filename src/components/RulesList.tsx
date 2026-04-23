import { useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Wand2 } from 'lucide-react';
import type { Rule, Account, Transaction } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getFinanceCategoryDef } from '../utils/categories';
import { matchRule } from '../utils/rules';
import ConfirmDialog from './ui/ConfirmDialog';

interface RulesListProps {
  rules: Rule[];
  accounts: Account[];
  transactions: Transaction[];
  onAdd: () => void;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onApplyToPast: (updates: { id: string; category: string }[]) => void;
  onNotify: (message: string) => void;
  onBack: () => void;
}

function categoryLabel(value: string): string {
  return getFinanceCategoryDef(value).label;
}

function categoryEmoji(value: string): string {
  return getFinanceCategoryDef(value).emoji;
}

function RuleCard({
  rule,
  accountName,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: Rule;
  accountName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-text-primary truncate">"{rule.pattern}"</span>
          <span className="text-text-secondary text-xs">→</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-light border border-border text-xs text-text-primary">
            {categoryEmoji(rule.category)} {categoryLabel(rule.category)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-text-secondary">
          {rule.type && <span>{rule.type === 'income' ? 'Income only' : 'Expense only'}</span>}
          {accountName && <span>· {accountName}</span>}
          <span>· Priority {rule.priority}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onToggle}
          role="switch"
          aria-checked={rule.enabled}
          aria-label={`${rule.enabled ? 'Disable' : 'Enable'} rule for "${rule.pattern}"`}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            rule.enabled ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              rule.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-light transition-colors"
          aria-label={`Edit rule for "${rule.pattern}"`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-surface-light transition-colors"
          aria-label={`Delete rule for "${rule.pattern}"`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function RulesList({
  rules,
  accounts,
  transactions,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  onApplyToPast,
  onNotify,
  onBack,
}: RulesListProps) {
  const [pendingDelete, setPendingDelete] = useState<Rule | null>(null);
  const [pendingApply, setPendingApply] = useState<{ count: number; updates: { id: string; category: string }[] } | null>(null);

  const sorted = [...rules].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const previewApplyToPast = () => {
    const reclassifiable = transactions.filter((t) => !t.deletedAt && (t.category === 'other' || t.category === 'other-income'));
    const updates: { id: string; category: string }[] = [];
    for (const t of reclassifiable) {
      const match = matchRule(t.description, t.type, t.accountId, rules);
      if (match && match.category !== t.category) {
        updates.push({ id: t.id, category: match.category });
      }
    }
    if (updates.length === 0) {
      onNotify('No uncategorized transactions match your current rules.');
      return;
    }
    setPendingApply({ count: updates.length, updates });
  };

  const hasNone = sorted.length === 0;

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-slide-in-right">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-surface-light transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h1 className="text-xl font-bold text-text-primary flex-1" data-heading>
          Auto-categorization
        </h1>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      <p className="text-sm text-text-secondary mb-4 px-1">
        When a new transaction's description contains a pattern below, its category is set automatically.
        Built-in keywords ({EXPENSE_CATEGORIES.length + INCOME_CATEGORIES.length} defaults) still apply as a fallback.
      </p>

      {hasNone && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">✨</p>
          <p className="text-text-secondary font-medium">No rules yet</p>
          <p className="text-sm text-text-tertiary mt-1">
            Create a rule to map a word or merchant name to a category.
          </p>
        </div>
      )}

      {!hasNone && (
        <div className="flex flex-col gap-2">
          {sorted.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              accountName={rule.accountId ? accounts.find((a) => a.id === rule.accountId)?.name : undefined}
              onEdit={() => onEdit(rule)}
              onDelete={() => setPendingDelete(rule)}
              onToggle={() => onToggle(rule.id, !rule.enabled)}
            />
          ))}
        </div>
      )}

      {!hasNone && (
        <button
          type="button"
          onClick={previewApplyToPast}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface-light border border-border text-sm font-medium text-text-primary hover:bg-surface-lighter transition-colors"
        >
          <Wand2 className="w-4 h-4 text-primary" />
          Apply rules to past transactions
        </button>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete rule for "${pendingDelete.pattern}"?`}
          onConfirm={() => { onDelete(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {pendingApply && (
        <ConfirmDialog
          title={`Recategorize ${pendingApply.count} transaction${pendingApply.count === 1 ? '' : 's'}?`}
          message={'Only transactions currently in the default "Other" category will be updated.'}
          confirmLabel="Apply"
          onConfirm={() => {
            onApplyToPast(pendingApply.updates);
            setPendingApply(null);
          }}
          onCancel={() => setPendingApply(null)}
        />
      )}
    </div>
  );
}
