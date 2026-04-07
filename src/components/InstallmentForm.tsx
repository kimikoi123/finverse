import { useState, useEffect, useRef } from 'react';
import { CURRENCIES } from '../utils/currencies';
import type { Installment, Account } from '../types';

interface InstallmentFormProps {
  accounts: Account[];
  onSave: (data: Omit<Installment, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  editingInstallment?: Installment;
}

export default function InstallmentForm({
  accounts,
  onSave,
  onCancel,
  editingInstallment,
}: InstallmentFormProps) {
  const isEditing = !!editingInstallment;

  const [itemName, setItemName] = useState(editingInstallment?.itemName ?? '');
  const [totalAmount, setTotalAmount] = useState(
    editingInstallment ? String(editingInstallment.totalAmount) : '',
  );
  const [monthlyPayment, setMonthlyPayment] = useState(
    editingInstallment ? String(editingInstallment.monthlyPayment) : '',
  );
  const [totalMonths, setTotalMonths] = useState(
    editingInstallment ? String(editingInstallment.totalMonths) : '',
  );
  const [paidMonths, setPaidMonths] = useState(
    editingInstallment ? String(editingInstallment.paidMonths) : '0',
  );
  const [startDate, setStartDate] = useState(
    () => editingInstallment?.startDate ?? new Date().toISOString().split('T')[0] ?? '',
  );
  const [creditCardAccountId, setCreditCardAccountId] = useState<string>(
    editingInstallment?.creditCardAccountId ?? '',
  );
  const [currency, setCurrency] = useState(
    editingInstallment?.currency ?? 'PHP',
  );
  const [notes, setNotes] = useState(editingInstallment?.notes ?? '');

  // Track whether user has manually edited monthlyPayment
  const monthlyManuallyEdited = useRef(!!editingInstallment);

  // Auto-calculate monthlyPayment when totalAmount and totalMonths change
  useEffect(() => {
    if (monthlyManuallyEdited.current) return;
    const total = parseFloat(totalAmount);
    const months = parseInt(totalMonths, 10);
    if (total > 0 && months > 0) {
      setMonthlyPayment(String(Math.ceil(total / months)));
    }
  }, [totalAmount, totalMonths]);

  const creditCards = accounts.filter((a) => a.type === 'credit');

  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedMonths = parseInt(totalMonths, 10) || 0;
  const canSave = itemName.trim().length > 0 && parsedTotal > 0 && parsedMonths > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      itemName: itemName.trim(),
      totalAmount: parsedTotal,
      monthlyPayment: parseFloat(monthlyPayment) || 0,
      totalMonths: parsedMonths,
      paidMonths: parseInt(paidMonths, 10) || 0,
      startDate,
      creditCardAccountId: creditCardAccountId || undefined,
      currency,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-text-secondary active:opacity-60 transition-opacity"
          >
            Cancel
          </button>
          <h1 className="text-base font-semibold text-text-primary">
            {isEditing ? 'Edit Installment' : 'Add Installment'}
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
        <div className="px-4 space-y-6 py-6">
          {/* Item name */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Item Name
            </label>
            <input
              type="text"
              placeholder="e.g. iPhone 16"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              aria-label="Item name"
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
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              aria-label="Total amount"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          {/* Number of months */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Number of Months
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="12"
              value={totalMonths}
              onChange={(e) => setTotalMonths(e.target.value)}
              aria-label="Number of months"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          {/* Monthly payment */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Monthly Payment
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="Auto-calculated"
              value={monthlyPayment}
              onChange={(e) => {
                monthlyManuallyEdited.current = true;
                setMonthlyPayment(e.target.value);
              }}
              aria-label="Monthly payment"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            {!monthlyManuallyEdited.current && parsedTotal > 0 && parsedMonths > 0 && (
              <p className="text-[11px] text-text-tertiary mt-1">
                Auto-calculated from total / months
              </p>
            )}
          </div>

          {/* Months paid so far */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Months Paid So Far
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="0"
              value={paidMonths}
              onChange={(e) => setPaidMonths(e.target.value)}
              aria-label="Months paid so far"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          {/* Start date */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Start date"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          {/* Link to credit card */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Credit Card (Optional)
            </label>
            <select
              value={creditCardAccountId}
              onChange={(e) => setCreditCardAccountId(e.target.value)}
              aria-label="Link to credit card"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary appearance-none focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            >
              <option value="">None</option>
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Currency"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary appearance-none focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            >
              {Object.entries(CURRENCIES).map(([code, config]) => (
                <option key={code} value={code}>
                  {config.symbol} {code} - {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Any additional details..."
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
