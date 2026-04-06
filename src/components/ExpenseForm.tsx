import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Check, X, Camera, Trash2 } from 'lucide-react';
import { CURRENCIES } from '../utils/currencies';
import { getAllCategories, toSlug } from '../utils/categories';
import { compressImage } from '../utils/imageUtils';
import { getReceiptPhoto } from '../db/storage';
import InlineAlert from './ui/InlineAlert';
import type { Member, Expense, SplitType } from '../types';

interface ExpenseFormProps {
  members: Member[];
  baseCurrency: string;
  customCategories?: string[];
  onAdd: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  onAddCategory?: (name: string) => void;
  editingExpense?: Expense;
  onEdit?: (id: string, updates: Omit<Expense, 'id' | 'createdAt'>) => void;
  onSaveReceipt?: (expenseId: string, dataUrl: string | null) => void;
  onPendingReceipt?: (dataUrl: string | null) => void;
}

export default function ExpenseForm({ members, baseCurrency, customCategories, onAdd, onCancel, onAddCategory, editingExpense, onEdit, onSaveReceipt, onPendingReceipt }: ExpenseFormProps) {
  const isEditing = !!editingExpense;
  const [description, setDescription] = useState(editingExpense?.description ?? '');
  const [amount, setAmount] = useState(editingExpense ? String(editingExpense.amount) : '');
  const [currency, setCurrency] = useState(editingExpense?.currency ?? baseCurrency);
  const [paidBy, setPaidBy] = useState(editingExpense?.paidBy ?? members[0]?.id ?? '');
  const [splitType, setSplitType] = useState<SplitType>(editingExpense?.splitType ?? 'equal');
  const [participants, setParticipants] = useState(editingExpense?.participants ?? members.map((m) => m.id));
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>(editingExpense?.customAmounts ?? {});
  const [advancePayments, setAdvancePayments] = useState<Record<string, number>>(editingExpense?.advancePayments ?? {});
  const [showAdvancePayments, setShowAdvancePayments] = useState(
    () => Object.values(editingExpense?.advancePayments ?? {}).some(v => v > 0)
  );
  const [category, setCategory] = useState(editingExpense?.category ?? 'general');
  const [date, setDate] = useState(() => editingExpense?.date ?? new Date().toISOString().slice(0, 10));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [receiptRemoved, setReceiptRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dismissValidation = useCallback(() => setValidationError(null), []);

  useEffect(() => {
    setValidationError(null);
  }, [splitType, customAmounts]);

  useEffect(() => {
    if (editingExpense) {
      getReceiptPhoto(editingExpense.id).then((data) => {
        if (data) setReceiptPhoto(data);
      });
    }
  }, [editingExpense]);

  const categories = getAllCategories(customCategories);

  const handleAddCategory = () => {
    const slug = toSlug(newCategoryName);
    if (!slug) return;
    if (categories.some((c) => c.value === slug)) {
      setCategory(slug);
      setAddingCategory(false);
      setNewCategoryName('');
      return;
    }
    onAddCategory?.(slug);
    setCategory(slug);
    setAddingCategory(false);
    setNewCategoryName('');
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setReceiptPhoto(dataUrl);
      setReceiptRemoved(false);
      if (!isEditing) onPendingReceipt?.(dataUrl);
    } catch {
      setValidationError('Failed to process image');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = () => {
    setReceiptPhoto(null);
    setReceiptRemoved(true);
    if (!isEditing) onPendingReceipt?.(null);
  };

  const toggleParticipant = (id: string) => {
    setParticipants((prev) => {
      const removing = prev.includes(id);
      if (removing) {
        setAdvancePayments((ap) => {
          const next = { ...ap };
          delete next[id];
          return next;
        });
        return prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !paidBy || participants.length === 0) return;

    const parsedAmount = parseFloat(amount);

    const expense: Omit<Expense, 'id' | 'createdAt'> = {
      description: description.trim(),
      amount: parsedAmount,
      currency,
      paidBy,
      splitType,
      participants,
      category,
      date,
      customAmounts: splitType === 'custom' ? customAmounts : {},
      advancePayments: showAdvancePayments ? advancePayments : {},
    };

    if (splitType === 'custom') {
      const total = Object.values(customAmounts).reduce((s, v) => s + (v || 0), 0);
      if (Math.abs(total - parsedAmount) > 0.01) {
        setValidationError(`Custom amounts (${total.toFixed(2)}) must equal the total (${parsedAmount.toFixed(2)})`);
        return;
      }
    }

    if (showAdvancePayments) {
      for (const [pid, advAmt] of Object.entries(advancePayments)) {
        if (advAmt <= 0) continue;
        let share: number;
        if (splitType === 'equal') {
          share = parsedAmount / participants.length;
        } else {
          const totalCustom = Object.values(customAmounts).reduce((s, v) => s + v, 0);
          share = totalCustom > 0 ? ((customAmounts[pid] ?? 0) / totalCustom) * parsedAmount : 0;
        }
        if (advAmt > share + 0.01) {
          const memberName = members.find(m => m.id === pid)?.name ?? 'Unknown';
          setValidationError(`${memberName}'s advance (${advAmt.toFixed(2)}) exceeds their share (${share.toFixed(2)})`);
          return;
        }
      }
    }

    if (isEditing && onEdit) {
      onEdit(editingExpense.id, expense);
      if (onSaveReceipt && (receiptPhoto || receiptRemoved)) {
        onSaveReceipt(editingExpense.id, receiptPhoto);
      }
    } else {
      onAdd(expense);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border p-5 space-y-5 animate-scale-in">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-medium text-text-secondary/50 uppercase tracking-widest" data-heading>
          {isEditing ? 'Edit Expense' : 'New Expense'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel expense form"
          className="p-1.5 rounded-lg hover:bg-surface-light transition-all text-text-secondary/50 hover:text-text-secondary"
        >
          <X size={15} />
        </button>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="What was it for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Expense description"
          className="sm:col-span-2 bg-surface-light/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface-light transition-all"
          autoFocus
        />

        <div className="flex gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Currency"
            className="w-20 sm:w-24 bg-surface-light/60 border border-border/60 rounded-xl px-2 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
          >
            {Object.entries(CURRENCIES).map(([code, c]) => (
              <option key={code} value={code}>
                {c.symbol} {code}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Expense amount"
            className="flex-1 bg-surface-light/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface-light transition-all"
          />
        </div>

        {addingCategory ? (
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } if (e.key === 'Escape') setAddingCategory(false); }}
              aria-label="New category name"
              className="flex-1 bg-surface-light/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
              autoFocus
            />
            <button type="button" onClick={handleAddCategory} className="p-3 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all" aria-label="Confirm new category">
              <Check size={14} />
            </button>
            <button type="button" onClick={() => setAddingCategory(false)} className="p-3 bg-surface-light border border-border/60 text-text-secondary hover:text-text-primary rounded-xl transition-all" aria-label="Cancel adding category">
              <X size={14} />
            </button>
          </div>
        ) : (
          <select
            value={category}
            onChange={(e) => {
              if (e.target.value === '__add_new__') {
                setAddingCategory(true);
              } else {
                setCategory(e.target.value);
              }
            }}
            aria-label="Expense category"
            className="bg-surface-light/60 border border-border/60 rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
            <option value="__add_new__">+ Add Category</option>
          </select>
        )}

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Expense date"
          className="sm:col-span-2 bg-surface-light/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
        />
      </div>

      {/* Receipt Photo */}
      <div className="pt-3 border-t border-border/20">
        <label className="text-[10px] font-medium text-text-secondary/50 uppercase tracking-widest mb-2.5 block" data-heading>Receipt photo</label>
        {receiptPhoto ? (
          <div className="relative inline-block">
            <img
              src={receiptPhoto}
              alt="Receipt"
              className="w-24 h-24 object-cover rounded-xl border border-border/40"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute -top-2 -right-2 p-1.5 bg-danger rounded-full text-white hover:bg-danger/80 transition-all shadow-sm"
              aria-label="Remove receipt photo"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-4 bg-surface-light/40 border border-dashed border-border/40 rounded-xl text-sm text-text-secondary/40 hover:text-text-secondary hover:border-primary/30 transition-all"
          >
            <Camera size={16} />
            Add receipt
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelect}
          className="hidden"
          aria-label="Upload receipt photo"
        />
      </div>

      {/* Paid By */}
      <div className="pt-3 border-t border-border/20">
        <label className="text-[10px] font-medium text-text-secondary/50 uppercase tracking-widest mb-2.5 block" data-heading>Paid by</label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaidBy(m.id)}
              className={`px-3.5 py-2 rounded-xl text-sm transition-all ${
                paidBy === m.id
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/25'
                  : 'bg-surface-light/60 text-text-secondary/70 hover:text-text-primary ring-1 ring-transparent'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Split Type */}
      <div className="pt-3 border-t border-border/20">
        <label className="text-[10px] font-medium text-text-secondary/50 uppercase tracking-widest mb-2.5 block" data-heading>Split type</label>
        <div className="flex gap-2">
          {(['equal', 'custom'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSplitType(type)}
              className={`px-4 py-2 rounded-xl text-sm capitalize transition-all ${
                splitType === type
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/25'
                  : 'bg-surface-light/60 text-text-secondary/70 hover:text-text-primary ring-1 ring-transparent'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Split Between */}
      <div className="pt-3 border-t border-border/20">
        <label className="text-[10px] font-medium text-text-secondary/50 uppercase tracking-widest mb-2.5 block" data-heading>
          Split between
        </label>
        {splitType === 'equal' ? (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const isSelected = participants.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleParticipant(m.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm transition-all ${
                    isSelected
                      ? 'bg-success/12 text-success ring-1 ring-success/25'
                      : 'bg-surface-light/60 text-text-secondary/50 hover:text-text-secondary ring-1 ring-transparent'
                  }`}
                >
                  {isSelected && <Check size={12} />}
                  {m.name}
                  {isSelected && amount
                    ? ` (${CURRENCIES[currency]?.symbol ?? ''}${(parseFloat(amount) / participants.length).toFixed(2)})`
                    : ''}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-sm text-text-primary/80 w-24 truncate">{m.name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={customAmounts[m.id] ?? ''}
                  onChange={(e) =>
                    setCustomAmounts((prev) => ({
                      ...prev,
                      [m.id]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  aria-label={`Custom amount for ${m.name}`}
                  className="flex-1 bg-surface-light/60 border border-border/60 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
            ))}
            {amount && (
              <p className="text-xs text-text-secondary/50">
                Assigned: {CURRENCIES[currency]?.symbol}
                {Object.values(customAmounts).reduce((s, v) => s + (v || 0), 0).toFixed(2)}
                {' / '}
                {CURRENCIES[currency]?.symbol}{parseFloat(amount).toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Advance Payments */}
      {participants.length > 0 && amount && (
        <div className="pt-3 border-t border-border/20">
          <button
            type="button"
            onClick={() => setShowAdvancePayments(!showAdvancePayments)}
            className="text-xs font-medium text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
          >
            {showAdvancePayments ? 'Hide advance payments' : 'Add advance payments'}
          </button>
          {showAdvancePayments && (
            <div className="mt-3 space-y-2.5">
              <p className="text-xs text-text-secondary/40">
                Mark amounts already paid in advance by participants
              </p>
              {participants
                .filter(pid => pid !== paidBy)
                .map((pid) => {
                  const memberName = members.find(m => m.id === pid)?.name ?? 'Unknown';
                  return (
                    <div key={pid} className="flex items-center gap-3">
                      <span className="text-sm text-text-primary/80 w-24 truncate">{memberName}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={advancePayments[pid] ?? ''}
                        onChange={(e) =>
                          setAdvancePayments((prev) => ({
                            ...prev,
                            [pid]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        aria-label={`Advance payment by ${memberName}`}
                        className="flex-1 bg-surface-light/60 border border-border/60 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                      />
                    </div>
                  );
                })}
              {participants.filter(pid => pid !== paidBy).length === 0 && (
                <p className="text-xs text-text-secondary/40 italic">Only the payer is a participant</p>
              )}
            </div>
          )}
        </div>
      )}

      <InlineAlert message={validationError} onDismiss={dismissValidation} autoDismissMs={5000} />

      <button
        type="submit"
        className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2 shadow-sm shadow-primary/20 active:scale-[0.98]"
      >
        {isEditing ? <Check size={15} /> : <Plus size={15} />}
        {isEditing ? 'Save Changes' : 'Add Expense'}
      </button>
    </form>
  );
}
