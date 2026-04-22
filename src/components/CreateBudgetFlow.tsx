import { useState, useCallback } from 'react';
import { ArrowLeft, X, Check, ChevronRight } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { Budget } from '../types';
import { EXPENSE_CATEGORIES } from '../utils/categories';
import type { FinanceCategoryDef } from '../utils/categories';
import { parseAmountInput, isKNotation } from '../utils/amountParser';
import { BUDGET_PRESETS, getPresetInitials } from '../utils/budgetPresets';
import type { BudgetPreset } from '../utils/budgetPresets';
import { ACCOUNT_COLORS } from '../hooks/useAccounts';
import LogoBadge from './ui/LogoBadge';

interface CreateBudgetFlowProps {
  mode: 'category' | 'custom';
  existingBudgets: Budget[];
  accounts: { id: string; name: string }[];
  onSave: (data: Omit<Budget, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  editingBudget?: Budget;
}

const PRESET_CATEGORY_LABELS: Record<string, string> = {
  subscription: 'Subscriptions',
  telecom: 'Telecom',
  utility: 'Utilities',
};

const COMMITMENT_PRESET_CATEGORIES: ReadonlyArray<'subscription' | 'telecom' | 'utility'> = [
  'subscription',
  'telecom',
  'utility',
];

function isCommitmentPreset(preset: BudgetPreset | null): boolean {
  if (!preset) return false;
  return COMMITMENT_PRESET_CATEGORIES.includes(preset.category);
}

function defaultVariesForPreset(preset: BudgetPreset): boolean {
  return preset.category === 'telecom' || preset.category === 'utility';
}

export default function CreateBudgetFlow({
  mode,
  existingBudgets,
  accounts,
  onSave,
  onCancel,
  editingBudget,
}: CreateBudgetFlowProps) {
  useEscapeKey(onCancel);

  const isEditing = !!editingBudget;

  // Determine initial step
  const getInitialStep = (): number => {
    if (isEditing) return 2;
    if (mode === 'category') return 1;
    // custom mode starts at preset grid (step 1)
    return 1;
  };

  const [step, setStep] = useState(getInitialStep);

  // Category mode state
  const [selectedCategory, setSelectedCategory] = useState<FinanceCategoryDef | null>(() => {
    if (isEditing && editingBudget.type === 'category' && editingBudget.categoryKey) {
      return EXPENSE_CATEGORIES.find((c) => c.value === editingBudget.categoryKey) ?? null;
    }
    return null;
  });

  // Custom mode state
  const [selectedPreset, setSelectedPreset] = useState<BudgetPreset | null>(() => {
    if (isEditing && editingBudget.preset) {
      return BUDGET_PRESETS.find((p) => p.key === editingBudget.preset) ?? null;
    }
    return null;
  });
  const [isCustomEntry, setIsCustomEntry] = useState(() => {
    return isEditing && editingBudget.type === 'custom' && !editingBudget.preset;
  });

  // Shared form state
  const [name, setName] = useState(editingBudget?.name ?? '');
  const [amount, setAmount] = useState(() =>
    editingBudget ? String(editingBudget.monthlyLimit) : ''
  );
  const [selectedColor, setSelectedColor] = useState(
    () => editingBudget?.color ?? ACCOUNT_COLORS[0] ?? '#2d6a4f'
  );

  const [commitmentEnabled, setCommitmentEnabled] = useState<boolean>(
    () => editingBudget?.isCommitment === true
  );
  const [dueDay, setDueDay] = useState<string>(() => {
    if (isEditing && editingBudget.dueDay !== undefined) return String(editingBudget.dueDay);
    return '';
  });
  const [varies, setVaries] = useState<boolean>(() => {
    if (isEditing && editingBudget.varies !== undefined) return editingBudget.varies;
    if (selectedPreset) return defaultVariesForPreset(selectedPreset);
    return false;
  });
  const [sourceAccountId, setSourceAccountId] = useState<string | undefined>(
    () => editingBudget?.sourceAccountId
  );

  // Available categories (filter out already-budgeted ones)
  const availableCategories = EXPENSE_CATEGORIES.filter((cat) => {
    if (isEditing && editingBudget.categoryKey === cat.value) return true;
    return !existingBudgets.some(
      (b) => b.type === 'category' && b.categoryKey === cat.value
    );
  });

  // Grouped presets
  const presetGroups = (['subscription', 'telecom', 'utility'] as const).map((cat) => ({
    key: cat,
    label: PRESET_CATEGORY_LABELS[cat] ?? cat,
    presets: BUDGET_PRESETS.filter((p) => p.category === cat),
  }));

  const parsedAmount = parseAmountInput(amount);

  const canSave = (() => {
    if (parsedAmount <= 0) return false;
    if (mode === 'category' && selectedCategory === null) return false;
    if (mode === 'custom' && name.trim().length === 0) return false;
    if (commitmentEnabled) {
      const d = parseInt(dueDay, 10);
      if (!Number.isFinite(d) || d < 1 || d > 31) return false;
    }
    return true;
  })();

  const handleCategorySelect = useCallback((cat: FinanceCategoryDef) => {
    setSelectedCategory(cat);
  }, []);

  const handlePresetSelect = useCallback((preset: BudgetPreset) => {
    setSelectedPreset(preset);
    setIsCustomEntry(false);
    setName(preset.name);
    setSelectedColor(preset.color);
    setVaries(defaultVariesForPreset(preset));
    setCommitmentEnabled(isCommitmentPreset(preset));
    setStep(2);
  }, []);

  const handleCustomEntrySelect = useCallback(() => {
    setSelectedPreset(null);
    setIsCustomEntry(true);
    setName('');
    setSelectedColor(ACCOUNT_COLORS[0] ?? '#2d6a4f');
    setCommitmentEnabled(false);
    setStep(2);
  }, []);

  const handleBack = useCallback(() => {
    if (isEditing) {
      onCancel();
      return;
    }
    if (step === 2 && mode === 'custom') {
      setStep(1);
      return;
    }
    onCancel();
  }, [step, mode, isEditing, onCancel]);

  const handleSave = useCallback(() => {
    if (!canSave) return;

    const commitmentFields = commitmentEnabled
      ? {
          isCommitment: true as const,
          dueDay: parseInt(dueDay, 10),
          varies,
          sourceAccountId: sourceAccountId || undefined,
          lastConfirmedMonth: editingBudget?.lastConfirmedMonth,
        }
      : {};

    if (mode === 'category' && selectedCategory) {
      onSave({
        name: selectedCategory.label,
        type: 'category',
        categoryKey: selectedCategory.value,
        monthlyLimit: parsedAmount,
        currency: 'PHP',
        icon: selectedCategory.emoji,
        color: '#2d6a4f',
        ...commitmentFields,
      });
      return;
    }

    // custom mode
    onSave({
      name: name.trim(),
      type: 'custom',
      monthlyLimit: parsedAmount,
      currency: 'PHP',
      icon: getPresetInitials(name.trim()),
      color: selectedColor,
      preset: selectedPreset?.key ?? undefined,
      ...commitmentFields,
    });
  }, [canSave, mode, selectedCategory, parsedAmount, name, selectedColor, selectedPreset, commitmentEnabled, dueDay, varies, sourceAccountId, onSave, editingBudget]);

  const headerTitle = (() => {
    if (isEditing) return 'Edit Budget';
    if (mode === 'category') return 'Category Budget';
    if (step === 1) return 'Choose Preset';
    if (commitmentEnabled) return 'Set Up Commitment';
    return 'Budget Details';
  })();

  const showSaveButton =
    (mode === 'category') ||
    (mode === 'custom' && step === 2);

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label={step === 1 || isEditing ? 'Close' : 'Back'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-start text-text-secondary active:opacity-60 transition-opacity"
          >
            {step === 1 || isEditing ? <X size={20} /> : <ArrowLeft size={20} />}
          </button>
          <h1 className="text-base font-semibold text-text-primary">
            {headerTitle}
          </h1>
          <div className="min-w-[44px]" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'category' && (
          <CategoryBudgetForm
            availableCategories={availableCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
            amount={amount}
            setAmount={setAmount}
            isEditing={isEditing}
            commitmentEnabled={commitmentEnabled}
            setCommitmentEnabled={setCommitmentEnabled}
            dueDay={dueDay}
            setDueDay={setDueDay}
            varies={varies}
            setVaries={setVaries}
            sourceAccountId={sourceAccountId}
            setSourceAccountId={setSourceAccountId}
            accounts={accounts}
          />
        )}

        {mode === 'custom' && step === 1 && (
          <PresetGrid
            presetGroups={presetGroups}
            onSelectPreset={handlePresetSelect}
            onSelectCustom={handleCustomEntrySelect}
          />
        )}

        {mode === 'custom' && step === 2 && (
          <CustomBudgetForm
            name={name}
            setName={setName}
            amount={amount}
            setAmount={setAmount}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
            isCustomEntry={isCustomEntry}
            commitmentEnabled={commitmentEnabled}
            setCommitmentEnabled={setCommitmentEnabled}
            dueDay={dueDay}
            setDueDay={setDueDay}
            varies={varies}
            setVaries={setVaries}
            sourceAccountId={sourceAccountId}
            setSourceAccountId={setSourceAccountId}
            accounts={accounts}
          />
        )}
      </div>

      {/* Sticky Save Footer */}
      {showSaveButton && (
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
            Save Budget
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Commitment Toggle + Fields (shared) ──────────────────────────── */

function CommitmentToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div>
      <label className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
        <span className="text-sm text-text-primary">Recurring commitment</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-5 w-5"
          aria-label="Enable recurring commitment"
        />
      </label>
      <p className="text-[11px] text-text-tertiary mt-1">
        Posts a bill each month on a chosen due day. Use for rent, subscriptions, utilities, or any fixed recurring expense.
      </p>
    </div>
  );
}

function CommitmentFieldsBlock({
  dueDay,
  setDueDay,
  varies,
  setVaries,
  sourceAccountId,
  setSourceAccountId,
  accounts,
}: {
  dueDay: string;
  setDueDay: (v: string) => void;
  varies: boolean;
  setVaries: (v: boolean) => void;
  sourceAccountId: string | undefined;
  setSourceAccountId: (v: string | undefined) => void;
  accounts: { id: string; name: string }[];
}) {
  return (
    <>
      <div>
        <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
          Due Day
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          placeholder="e.g. 15"
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          aria-label="Due day of month"
          className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
        />
        <p className="text-[11px] text-text-tertiary mt-1">Day of the month (1–31). Auto-adjusts for short months.</p>
      </div>

      <div>
        <label className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
          <span className="text-sm text-text-primary">Varies each month</span>
          <input
            type="checkbox"
            checked={varies}
            onChange={(e) => setVaries(e.target.checked)}
            className="h-5 w-5"
            aria-label="Bill amount varies each month"
          />
        </label>
        <p className="text-[11px] text-text-tertiary mt-1">
          {varies
            ? 'Bill posts as pending until you confirm the actual amount.'
            : 'Bill auto-posts at the expected amount each month.'}
        </p>
      </div>

      <div>
        <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
          Source Account (optional)
        </label>
        <select
          value={sourceAccountId ?? ''}
          onChange={(e) => setSourceAccountId(e.target.value || undefined)}
          aria-label="Source account"
          className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
        >
          <option value="">None</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
    </>
  );
}

/* ── Category Budget Form ──────────────────────────────────────────── */

function CategoryBudgetForm({
  availableCategories,
  selectedCategory,
  onSelectCategory,
  amount,
  setAmount,
  isEditing,
  commitmentEnabled,
  setCommitmentEnabled,
  dueDay,
  setDueDay,
  varies,
  setVaries,
  sourceAccountId,
  setSourceAccountId,
  accounts,
}: {
  availableCategories: FinanceCategoryDef[];
  selectedCategory: FinanceCategoryDef | null;
  onSelectCategory: (cat: FinanceCategoryDef) => void;
  amount: string;
  setAmount: (v: string) => void;
  isEditing: boolean;
  commitmentEnabled: boolean;
  setCommitmentEnabled: (v: boolean) => void;
  dueDay: string;
  setDueDay: (v: string) => void;
  varies: boolean;
  setVaries: (v: boolean) => void;
  sourceAccountId: string | undefined;
  setSourceAccountId: (v: string | undefined) => void;
  accounts: { id: string; name: string }[];
}) {
  return (
    <div className="px-4 py-6 space-y-6 pb-4">
      {/* Category picker */}
      {!isEditing && (
        <div>
          <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-3 block">
            Category
          </label>
          {availableCategories.length === 0 ? (
            <p className="text-sm text-text-secondary">
              All categories already have budgets.
            </p>
          ) : (
            <div className="space-y-2">
              {availableCategories.map((cat) => {
                const isSelected = selectedCategory?.value === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-surface border-border'
                    }`}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? 'text-primary' : 'text-text-primary'
                      }`}
                    >
                      {cat.label}
                    </span>
                    {isSelected && (
                      <Check
                        size={16}
                        className="ml-auto text-primary"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Editing: show locked category */}
      {isEditing && selectedCategory && (
        <div>
          <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
            Category
          </label>
          <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3 opacity-70">
            <span className="text-xl">{selectedCategory.emoji}</span>
            <span className="text-sm font-medium text-text-primary">
              {selectedCategory.label}
            </span>
          </div>
        </div>
      )}

      {/* Monthly limit / expected amount */}
      <div>
        <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
          {commitmentEnabled ? 'Expected Amount' : 'Monthly Limit'}
        </label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Monthly budget limit"
          className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
          autoFocus={isEditing}
        />
        {isKNotation(amount) && (
          <p className="text-[11px] text-primary/70 mt-1">= {parseAmountInput(amount).toLocaleString()}</p>
        )}
      </div>

      <CommitmentToggle enabled={commitmentEnabled} onToggle={setCommitmentEnabled} />

      {commitmentEnabled && (
        <CommitmentFieldsBlock
          dueDay={dueDay}
          setDueDay={setDueDay}
          varies={varies}
          setVaries={setVaries}
          sourceAccountId={sourceAccountId}
          setSourceAccountId={setSourceAccountId}
          accounts={accounts}
        />
      )}

    </div>
  );
}

/* ── Preset Grid (Custom mode, Step 1) ─────────────────────────────── */

function PresetGrid({
  presetGroups,
  onSelectPreset,
  onSelectCustom,
}: {
  presetGroups: { key: string; label: string; presets: BudgetPreset[] }[];
  onSelectPreset: (preset: BudgetPreset) => void;
  onSelectCustom: () => void;
}) {
  return (
    <div className="px-4 py-6 space-y-6">
      <p className="text-sm text-text-secondary">
        Pick a preset or create a custom budget.
      </p>

      {presetGroups.map((group) => (
        <div key={group.key}>
          <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-3 block">
            {group.label}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {group.presets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className="flex flex-col items-center gap-2 bg-surface rounded-2xl border border-border p-4 active:scale-[0.98] transition-transform"
              >
                <LogoBadge logo={preset.logo} name={preset.name} color={preset.color} size="lg" />
                <span className="text-xs text-text-primary text-center leading-tight font-medium truncate w-full">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Custom option */}
      <div>
        <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-3 block">
          Other
        </label>
        <button
          type="button"
          onClick={onSelectCustom}
          className="w-full flex items-center gap-4 bg-surface rounded-2xl border border-border p-4 active:scale-[0.98] transition-transform text-left"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-text-secondary/20 text-text-secondary text-lg font-bold flex-shrink-0">
            +
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-text-primary">
              Custom
            </div>
            <div className="text-xs text-text-secondary mt-0.5">
              Create your own budget
            </div>
          </div>
          <ChevronRight size={16} className="text-text-secondary flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}

/* ── Custom Budget Form (Step 2) ───────────────────────────────────── */

function CustomBudgetForm({
  name, setName, amount, setAmount, selectedColor, setSelectedColor, isCustomEntry,
  commitmentEnabled, setCommitmentEnabled, dueDay, setDueDay, varies, setVaries, sourceAccountId, setSourceAccountId, accounts,
}: {
  name: string; setName: (v: string) => void;
  amount: string; setAmount: (v: string) => void;
  selectedColor: string; setSelectedColor: (v: string) => void;
  isCustomEntry: boolean;
  commitmentEnabled: boolean; setCommitmentEnabled: (v: boolean) => void;
  dueDay: string; setDueDay: (v: string) => void;
  varies: boolean; setVaries: (v: boolean) => void;
  sourceAccountId: string | undefined; setSourceAccountId: (v: string | undefined) => void;
  accounts: { id: string; name: string }[];
}) {
  return (
    <div className="px-4 py-6 space-y-6 pb-4">
      {/* Name */}
      <div>
        <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
          Name
        </label>
        <input
          type="text"
          placeholder="e.g. Gym Membership"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Budget name"
          className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
          autoFocus={isCustomEntry}
        />
      </div>

      {/* Monthly limit */}
      <div>
        <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
          {commitmentEnabled ? 'Expected Amount' : 'Monthly Limit'}
        </label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Monthly budget limit"
          className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
          autoFocus={!isCustomEntry}
        />
        {isKNotation(amount) && (
          <p className="text-[11px] text-primary/70 mt-1">= {parseAmountInput(amount).toLocaleString()}</p>
        )}
      </div>

      <CommitmentToggle enabled={commitmentEnabled} onToggle={setCommitmentEnabled} />

      {commitmentEnabled && (
        <CommitmentFieldsBlock
          dueDay={dueDay}
          setDueDay={setDueDay}
          varies={varies}
          setVaries={setVaries}
          sourceAccountId={sourceAccountId}
          setSourceAccountId={setSourceAccountId}
          accounts={accounts}
        />
      )}

      {/* Color picker */}
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
  );
}
