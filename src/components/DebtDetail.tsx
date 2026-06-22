import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { parseAmountInput } from '../utils/amountParser';
import { parseISODateLocal } from '../utils/dates';
import { formatCurrency } from '../utils/currencies';
import type { DebtEntry, DebtPayment } from '../types';
import ConfirmDialog from './ui/ConfirmDialog';

interface DebtDetailProps {
  debt: DebtEntry;
  payments: DebtPayment[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddPayment: (debtId: string, amount: number) => Promise<DebtPayment>;
  onEditPayment: (id: string, updates: { amount: number }) => Promise<void>;
  onRemovePayment: (id: string) => Promise<void>;
}

export default function DebtDetail({
  debt,
  payments,
  onBack,
  onEdit,
  onDelete,
  onAddPayment,
  onEditPayment,
  onRemovePayment,
}: DebtDetailProps) {
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [pendingDelete, setPendingDelete] = useState<DebtPayment | null>(null);
  const [showDeleteDebt, setShowDeleteDebt] = useState(false);

  const remaining = debt.amount - debt.paidAmount;
  const progressPercent = debt.amount > 0 ? Math.min((debt.paidAmount / debt.amount) * 100, 100) : 0;
  const isIOwe = debt.direction === 'i_owe';

  // Newest first. Tie-break on createdAt so same-day payments keep order.
  const sortedPayments = useMemo(
    () =>
      [...payments].sort((a, b) =>
        b.date !== a.date ? b.date.localeCompare(a.date) : b.createdAt.localeCompare(a.createdAt),
      ),
    [payments],
  );

  const parsedNew = parseAmountInput(paymentAmount);
  const cappedNew = Math.min(parsedNew, remaining);
  const canAddPayment = cappedNew > 0;

  const handleAddPayment = async () => {
    if (!canAddPayment) return;
    await onAddPayment(debt.id, cappedNew);
    setPaymentAmount('');
    setShowPaymentInput(false);
  };

  const startEdit = (p: DebtPayment) => {
    setEditingId(p.id);
    setEditAmount(String(p.amount));
  };

  const handleSaveEdit = async (p: DebtPayment) => {
    const parsed = parseAmountInput(editAmount);
    // Cap so paid never exceeds the total: remaining excludes this payment.
    const remainingWithout = debt.amount - (debt.paidAmount - p.amount);
    const capped = Math.min(parsed, remainingWithout);
    if (capped > 0 && capped !== p.amount) {
      await onEditPayment(p.id, { amount: capped });
    }
    setEditingId(null);
    setEditAmount('');
  };

  return (
    <div className="max-w-2xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div
        className={`text-white px-4 pt-3 pb-5 rounded-b-3xl bg-gradient-to-br ${
          isIOwe ? 'from-red-500 to-red-700' : 'from-emerald-500 to-emerald-700'
        }`}
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors">
              Edit
            </button>
            <button onClick={() => setShowDeleteDebt(true)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors">
              Delete
            </button>
          </div>
        </div>
        <div className="text-[11px] uppercase tracking-widest opacity-80">{isIOwe ? 'I owe' : 'Owed to me'}</div>
        <div className="text-2xl font-bold mt-1">{debt.personName}</div>
        <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2 text-sm">
          <span className="opacity-90">
            {formatCurrency(debt.paidAmount, debt.currency)} paid / {formatCurrency(debt.amount, debt.currency)}
          </span>
          <span className="font-semibold">{formatCurrency(remaining, debt.currency)} left</span>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Record payment */}
        {showPaymentInput ? (
          <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">Payment Amount</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              autoFocus
              className="w-full bg-bg border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddPayment}
                disabled={!canAddPayment}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                Record Payment
              </button>
              <button
                onClick={() => { setShowPaymentInput(false); setPaymentAmount(''); }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-surface-hover text-text-secondary hover:bg-border/50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          remaining > 0 && (
            <button
              onClick={() => setShowPaymentInput(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all mb-4"
            >
              <Plus size={16} /> Record Payment
            </button>
          )
        )}

        {/* Payment log */}
        <div className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
          Payment History
        </div>
        {sortedPayments.length === 0 ? (
          <div className="text-sm text-text-secondary py-6 text-center">No payments recorded yet</div>
        ) : (
          <div className="border-l-2 border-border pl-3">
            {sortedPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm mb-2.5">
                {editingId === p.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      autoFocus
                      aria-label="Edit payment amount"
                      className="flex-1 min-w-0 bg-surface-light border border-border rounded-lg py-1.5 px-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
                    />
                    <button
                      onClick={() => handleSaveEdit(p)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-success/10 text-text-secondary hover:text-success transition-colors"
                      aria-label="Save payment"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditAmount(''); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-light text-text-secondary transition-colors"
                      aria-label="Cancel edit"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-text-secondary">
                      {parseISODateLocal(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' — '}
                      <span className="font-medium text-text-primary">{formatCurrency(p.amount, debt.currency)}</span>
                      {p.editedAt && <span className="ml-1.5 text-[11px] text-text-secondary/70">(edited)</span>}
                      {p.notes && <span className="ml-1.5 text-[11px] text-text-secondary/70">· {p.notes}</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-light text-text-secondary hover:text-text-primary transition-colors"
                        aria-label="Edit payment"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setPendingDelete(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors"
                        aria-label="Delete payment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete payment?"
          message={`Remove the ${formatCurrency(pendingDelete.amount, debt.currency)} payment from the log?`}
          confirmLabel="Delete"
          onConfirm={() => { void onRemovePayment(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {showDeleteDebt && (
        <ConfirmDialog
          title={`Delete debt for ${debt.personName}?`}
          message="This removes the debt and its entire payment history."
          confirmLabel="Delete"
          onConfirm={() => { onDelete(); setShowDeleteDebt(false); }}
          onCancel={() => setShowDeleteDebt(false)}
        />
      )}
    </div>
  );
}
