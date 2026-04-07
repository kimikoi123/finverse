import { useState, useMemo, useRef, useEffect } from 'react';
import { Pencil, Trash2, ReceiptText, Calendar, Search, X, Camera } from 'lucide-react';
import { formatCurrency } from '../utils/currencies';
import { getAllCategories, getCategoryIcon, getCategoryColor } from '../utils/categories';
import { getReceiptPhotosForTrip } from '../db/storage';
import type { Expense, Member } from '../types';

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  customCategories?: string[];
  onRemove: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onQuickEdit: (id: string, updates: Partial<Expense>) => void;
  showToast: (message: string, onCommit: () => void) => string;
}

export default function ExpenseList({ expenses, members, customCategories, onRemove, onEdit, onQuickEdit, showToast }: ExpenseListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [openPaidByDropdown, setOpenPaidByDropdown] = useState<string | null>(null);
  const [receiptPhotos, setReceiptPhotos] = useState<Map<string, string>>(new Map());
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openPaidByDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenPaidByDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPaidByDropdown]);

  useEffect(() => {
    const expenseIds = expenses.filter(e => !e.isSettlement).map(e => e.id);
    if (expenseIds.length > 0) {
      getReceiptPhotosForTrip(expenseIds).then(setReceiptPhotos);
    }
  }, [expenses]);

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';

  const handleRemove = (expense: Expense) => {
    setPendingDeletes((prev) => new Set(prev).add(expense.id));

    showToast(`"${expense.description}" deleted`, () => {
      onRemove(expense.id);
    });

    setTimeout(() => {
      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.delete(expense.id);
        return next;
      });
    }, 5500);
  };

  const visibleExpenses = expenses.filter((e) => !pendingDeletes.has(e.id) && !e.isSettlement);

  const filteredExpenses = useMemo(() => {
    let result = visibleExpenses;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) => e.description.toLowerCase().includes(query));
    }
    if (selectedCategory) {
      result = result.filter((e) => e.category === selectedCategory);
    }
    return result;
  }, [visibleExpenses, searchQuery, selectedCategory]);

  const hasActiveFilters = searchQuery || selectedCategory;

  if (expenses.filter(e => !e.isSettlement).length === 0) {
    return (
      <div className="text-center py-10">
        <ReceiptText size={28} className="text-text-secondary/30 mx-auto mb-3" />
        <p className="text-text-secondary/60 text-sm">No expenses yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search & Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative group">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/30 group-focus-within:text-text-secondary/50 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses..."
            aria-label="Search expenses"
            className="w-full pl-9 pr-8 py-2.5 bg-surface-light/40 border border-border/40 rounded-xl text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-secondary/30 hover:text-text-secondary transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                !selectedCategory
                  ? 'bg-primary/12 text-primary ring-1 ring-primary/20'
                  : 'bg-surface-light/40 border border-border/30 text-text-secondary/50 hover:text-text-secondary'
              }`}
            >
              All
            </button>
            {getAllCategories(customCategories).map((cat) => {
              const Icon = getCategoryIcon(cat.value);
              const isActive = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(isActive ? null : cat.value)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
                    isActive
                      ? getCategoryColor(cat.value) + ' ring-1 ring-current/20'
                      : 'bg-surface-light/40 border border-border/30 text-text-secondary/50 hover:text-text-secondary'
                  }`}
                >
                  <Icon size={11} />
                  {cat.label}
                </button>
              );
            })}
          </div>
          <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-bg to-transparent pointer-events-none sm:hidden" />
        </div>
      </div>

      {/* Expense Items */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-8">
          <Search size={22} className="text-text-secondary/25 mx-auto mb-2" />
          <p className="text-text-secondary/50 text-sm">No matching expenses</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
            className="mt-2 text-xs text-primary/60 hover:text-primary transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {hasActiveFilters && (
            <p className="text-xs text-text-secondary/40 px-1">
              {filteredExpenses.length} of {visibleExpenses.length} expenses
            </p>
          )}
          {[...filteredExpenses].reverse().map((expense) => {
            const Icon = getCategoryIcon(expense.category);
            const colorClass = getCategoryColor(expense.category);
            const hasReceipt = receiptPhotos.has(expense.id);

            return (
              <div
                key={expense.id}
                className="bg-surface rounded-2xl border border-border p-3.5 flex items-center gap-3 group hover:bg-surface-light/20 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative ${colorClass}`}>
                  <Icon size={17} />
                  {hasReceipt && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                      <Camera size={7} className="text-white" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {expense.description}
                    </p>
                    <p className="text-base font-semibold text-text-primary shrink-0 ml-3 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-text-secondary/50 min-w-0">
                      <span className="flex items-center gap-0.5 shrink-0">
                        <Calendar size={10} className="-mt-0.5" />
                        {new Date(expense.date || expense.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="shrink-0">&middot;</span>
                      <span className="shrink-0 relative" ref={openPaidByDropdown === expense.id ? dropdownRef : undefined}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenPaidByDropdown(openPaidByDropdown === expense.id ? null : expense.id);
                          }}
                          className="hover:bg-white/5 rounded px-1 -mx-1 py-0.5 -my-0.5 transition-colors"
                          aria-label={`Change who paid for ${expense.description}`}
                          aria-expanded={openPaidByDropdown === expense.id}
                          aria-haspopup="listbox"
                        >
                          Paid by <span className="text-primary-light/80 underline decoration-dotted underline-offset-2">{getMemberName(expense.paidBy)}</span>
                        </button>
                        {openPaidByDropdown === expense.id && (
                          <div
                            role="listbox"
                            aria-label="Select who paid"
                            className="absolute left-0 top-full mt-1 z-50 bg-surface-elevated border border-border rounded-xl shadow-layered-lg py-1 min-w-[140px] animate-fade-in"
                          >
                            {members.map((member) => (
                              <button
                                key={member.id}
                                role="option"
                                aria-selected={member.id === expense.paidBy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (member.id !== expense.paidBy) {
                                    onQuickEdit(expense.id, { paidBy: member.id });
                                  }
                                  setOpenPaidByDropdown(null);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors min-h-[44px] flex items-center ${
                                  member.id === expense.paidBy
                                    ? 'text-primary-light bg-primary/8'
                                    : 'text-text-primary hover:bg-white/[0.03]'
                                }`}
                              >
                                {member.name}
                                {member.id === expense.paidBy && <span className="ml-auto text-primary-light">&#10003;</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </span>
                      <span className="hidden sm:inline shrink-0">&middot;</span>
                      <span className="hidden sm:inline shrink-0">{expense.splitType === 'equal' ? 'Equal' : 'Custom'} &middot; {expense.participants.length} people</span>
                      {expense.advancePayments && Object.values(expense.advancePayments).some(v => v > 0) && (
                        <>
                          <span className="shrink-0">&middot;</span>
                          <span className="shrink-0 text-accent/70">Advance paid</span>
                        </>
                      )}
                      {hasReceipt && (
                        <>
                          <span className="shrink-0 sm:hidden">&middot;</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setViewingReceipt(receiptPhotos.get(expense.id)!); }}
                            className="shrink-0 sm:hidden text-primary-light/60 hover:text-primary transition-colors flex items-center gap-0.5"
                            aria-label="View receipt"
                          >
                            <Camera size={10} />
                            <span>Receipt</span>
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center shrink-0 gap-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {hasReceipt && (
                        <button
                          onClick={() => setViewingReceipt(receiptPhotos.get(expense.id)!)}
                          aria-label="View receipt"
                          className="hidden sm:flex min-w-[40px] min-h-[40px] items-center justify-center rounded-lg text-text-secondary/40 hover:text-primary transition-colors"
                        >
                          <Camera size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(expense)}
                        aria-label={`Edit expense: ${expense.description}`}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-text-secondary/40 hover:text-primary transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleRemove(expense)}
                        aria-label={`Delete expense: ${expense.description}`}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-text-secondary/40 hover:text-danger transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt Photo Viewer Modal */}
      {viewingReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingReceipt(null)}
        >
          <div className="relative max-w-lg w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewingReceipt(null)}
              className="absolute -top-3 -right-3 z-10 p-2 bg-surface-elevated rounded-full border border-border text-text-secondary hover:text-text-primary transition-all shadow-layered-md"
              aria-label="Close receipt viewer"
            >
              <X size={14} />
            </button>
            <img
              src={viewingReceipt}
              alt="Receipt"
              className="w-full rounded-2xl border border-border"
            />
          </div>
        </div>
      )}
    </div>
  );
}
