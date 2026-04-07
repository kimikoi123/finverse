import { useState, useCallback } from 'react';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import type { Budget } from '../types';
import { EXPENSE_CATEGORIES } from '../utils/categories';
import type { FinanceCategoryDef } from '../utils/categories';
import { BUDGET_PRESETS, getPresetInitials } from '../utils/budgetPresets';
import type { BudgetPreset } from '../utils/budgetPresets';
import { ACCOUNT_COLORS } from '../hooks/useAccounts';

interface CreateBudgetFlowProps {
  mode: 'category' | 'custom';
  existingBudgets: Budget[];
  onSave: (data: Omit<Budget, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  editingBudget?: Budget;
}

const PRESET_CATEGORY_LABELS: Record<string, string> = {
  subscription: 'Subscriptions',
  telecom: 'Telecom',
  utility: 'Utilities',
};

export default function CreateBudgetFlow({
  mode,
  existingBudgets,
  onSave,
  onCancel,
  editingBudget,
}: CreateBudgetFlowProps) {
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

  const parsedAmount = parseFloat(amount) || 0;

  const canSave = (() => {
    if (parsedAmount <= 0) return false;
    if (mode === 'category') return selectedCategory !== null;
    // custom mode
    return name.trim().length > 0;
  })();

  const handleCategorySelect = useCallback((cat: FinanceCategoryDef) => {
    setSelectedCategory(cat);
  }, []);

  const handlePresetSelect = useCallback((preset: BudgetPreset) => {
    setSelectedPreset(preset);
    setIsCustomEntry(false);
    setName(preset.name);
    setSelectedColor(preset.color);
    setStep(2);
  }, []);

  const handleCustomEntrySelect = useCallback(() => {
    setSelectedPreset(null);
    setIsCustomEntry(true);
    setName('');
    setSelectedColor(ACCOUNT_COLORS[0] ?? '#2d6a4f');
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

    if (mode === 'category' && selectedCategory) {
      onSave({
        name: selectedCategory.label,
        type: 'category',
        categoryKey: selectedCategory.value,
        monthlyLimit: parsedAmount,
        currency: 'PHP',
        icon: selectedCategory.emoji,
        color: '#2d6a4f',
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
    });
  }, [canSave, mode, selectedCategory, parsedAmount, name, selectedColor, selectedPreset, onSave]);

  const headerTitle = (() => {
    if (isEditing) return 'Edit Budget';
    if (mode === 'category') return 'Category Budget';
    if (step === 1) return 'Choose Preset';
    return 'Budget Details';
  })();

  const showSaveButton =
    (mode === 'category') ||
    (mode === 'custom' && step === 2);

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-text-secondary active:opacity-60 transition-opacity"
          >
            <ArrowLeft size={18} />
            <span>
              {step === 1 || isEditing ? 'Cancel' : 'Back'}
            </span>
          </button>
          <h1 className="text-base font-semibold text-text-primary">
            {headerTitle}
          </h1>
          {showSaveButton ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`text-sm font-semibold transition-opacity ${
                canSave
                  ? 'text-primary active:opacity-60'
                  : 'text-primary opacity-50 cursor-not-allowed'
              }`}
            >
              Save
            </button>
          ) : (
            <div className="w-10" />
          )}
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
            canSave={canSave}
            onSave={handleSave}
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
            canSave={canSave}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
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
  canSave,
  onSave,
}: {
  availableCategories: FinanceCategoryDef[];
  selectedCategory: FinanceCategoryDef | null;
  onSelectCategory: (cat: FinanceCategoryDef) => void;
  amount: string;
  setAmount: (v: string) => void;
  isEditing: boolean;
  canSave: boolean;
  onSave: () => void;
}) {
  return (
    <div className="px-4 py-6 space-y-6 pb-10">
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

      {/* Monthly limit */}
      <div>
        <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
          Monthly Limit
        </label>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Monthly budget limit"
          className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          autoFocus={isEditing}
        />
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={onSave}
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
                className="flex flex-col items-center gap-2 bg-surface rounded-2xl border border-border p-4 active:scale-[0.96] transition-transform"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: preset.color }}
                >
                  {getPresetInitials(preset.name)}
                </div>
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
  name,
  setName,
  amount,
  setAmount,
  selectedColor,
  setSelectedColor,
  isCustomEntry,
  canSave,
  onSave,
}: {
  name: string;
  setName: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  selectedColor: string;
  setSelectedColor: (v: string) => void;
  isCustomEntry: boolean;
  canSave: boolean;
  onSave: () => void;
}) {
  return (
    <div className="px-4 py-6 space-y-6 pb-10">
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
          Monthly Limit
        </label>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Monthly budget limit"
          className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          autoFocus={!isCustomEntry}
        />
      </div>

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

      {/* Save button */}
      <button
        type="button"
        onClick={onSave}
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
  );
}
