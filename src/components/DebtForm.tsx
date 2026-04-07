import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CURRENCIES } from '../utils/currencies';
import type { DebtEntry, DebtDirection } from '../types';

interface DebtFormProps {
  onSave: (data: Omit<DebtEntry, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  editingDebt?: DebtEntry;
}

export default function DebtForm({
  onSave,
  onCancel,
  editingDebt,
}: DebtFormProps) {
  const [direction, setDirection] = useState<DebtDirection>(
    editingDebt?.direction ?? 'i_owe',
  );
  const [personName, setPersonName] = useState(editingDebt?.personName ?? '');
  const [amount, setAmount] = useState(
    editingDebt ? String(editingDebt.amount) : '',
  );
  const [paidAmount, setPaidAmount] = useState(
    editingDebt ? String(editingDebt.paidAmount) : '0',
  );
  const [currency, setCurrency] = useState(editingDebt?.currency ?? 'PHP');
  const [dueDate, setDueDate] = useState(editingDebt?.dueDate ?? '');
  const [notes, setNotes] = useState(editingDebt?.notes ?? '');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPaid = parseFloat(paidAmount) || 0;
  const canSave = personName.trim().length > 0 && parsedAmount > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      direction,
      personName: personName.trim(),
      amount: parsedAmount,
      paidAmount: parsedPaid,
      currency,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const isEditing = Boolean(editingDebt);
  const isIOwe = direction === 'i_owe';
  const headerTint = isIOwe
    ? 'bg-red-500/5 border-b border-red-500/10'
    : 'bg-green-500/5 border-b border-green-500/10';

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header bar */}
      <div className={`flex-shrink-0 ${headerTint}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-text-secondary active:opacity-60 transition-opacity"
          >
            Cancel
          </button>
          <h1 className="text-base font-semibold text-text-primary">
            {isEditing ? 'Edit Debt' : 'Add Debt'}
          </h1>
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
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Direction toggle */}
        <div className="flex flex-col items-center py-8 px-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-3">
            Direction
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection('i_owe')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isIOwe
                  ? 'bg-primary text-white'
                  : 'bg-surface-light border border-border text-text-secondary'
              }`}
            >
              I Owe
            </button>
            <button
              type="button"
              onClick={() => setDirection('owed_to_me')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                !isIOwe
                  ? 'bg-primary text-white'
                  : 'bg-surface-light border border-border text-text-secondary'
              }`}
            >
              Owed to Me
            </button>
          </div>
        </div>

        <div className="px-4 space-y-6 pb-8">
          {/* Person name */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Person Name
            </label>
            <input
              type="text"
              placeholder="Who is this debt with?"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              aria-label="Person name"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
              autoFocus
            />
          </div>

          {/* Total amount */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Total Amount
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Total amount"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-2xl font-bold text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          {/* Amount paid */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Amount Paid So Far
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              aria-label="Amount paid so far"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          {/* Currency selector */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Currency
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCurrencyDropdown((prev) => !prev)}
                className="w-full flex items-center justify-between bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary transition-all hover:bg-surface-light"
              >
                <span>
                  {CURRENCIES[currency]?.symbol ?? ''} {currency} &mdash;{' '}
                  {CURRENCIES[currency]?.name ?? currency}
                </span>
                <ChevronDown size={14} className="text-text-secondary" />
              </button>

              {showCurrencyDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowCurrencyDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {Object.entries(CURRENCIES).map(([code, config]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setCurrency(code);
                          setShowCurrencyDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          currency === code
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-text-primary hover:bg-surface-light'
                        }`}
                      >
                        {config.symbol} {code}{' '}
                        <span className="text-text-secondary text-xs">
                          {config.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Due date"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Add any details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              aria-label="Notes"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
