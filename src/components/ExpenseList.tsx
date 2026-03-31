import { useState, useMemo, useRef, useEffect } from 'react';
import { Pencil, Trash2, Utensils, Car, Home, Ticket, ShoppingBag, ReceiptText, Calendar, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatCurrency } from '../utils/currencies';
import type { Expense, Member } from '../types';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  activities: Ticket,
  shopping: ShoppingBag,
  general: ReceiptText,
};

const CATEGORY_COLORS: Record<string, string> = {
  food: 'text-orange-400 bg-orange-400/15',
  transport: 'text-blue-400 bg-blue-400/15',
  accommodation: 'text-purple-400 bg-purple-400/15',
  activities: 'text-green-400 bg-green-400/15',
  shopping: 'text-pink-400 bg-pink-400/15',
  general: 'text-gray-400 bg-gray-400/15',
};

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  transport: 'Transport',
  accommodation: 'Accommodation',
  activities: 'Activities',
  shopping: 'Shopping',
  general: 'General',
};

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  onRemove: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onQuickEdit: (id: string, updates: Partial<Expense>) => void;
  showToast: (message: string, onCommit: () => void) => string;
}

export default function ExpenseList({ expenses, members, onRemove, onEdit, onQuickEdit, showToast }: ExpenseListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [openPaidByDropdown, setOpenPaidByDropdown] = useState<string | null>(null);
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

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';

  const handleRemove = (expense: Expense) => {
    setPendingDeletes((prev) => new Set(prev).add(expense.id));

    showToast(`"${expense.description}" deleted`, () => {
      onRemove(expense.id);
    });

    // Clean up pending state after toast duration (whether committed or undone)
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
      <div className="text-center py-8">
        <ReceiptText size={32} className="text-text-secondary mx-auto mb-2" />
        <p className="text-text-secondary text-sm">No expenses yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses..."
            aria-label="Search expenses"
            className="w-full pl-8 pr-8 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              All
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const Icon = CATEGORY_ICONS[key]!;
              const isActive = selectedCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(isActive ? null : key)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    isActive
                      ? CATEGORY_COLORS[key]!
                      : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              );
            })}
          </div>
          <div className="absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-[#13131f] to-transparent pointer-events-none sm:hidden" />
        </div>
      </div>

      {/* Expense Items */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-6">
          <Search size={24} className="text-text-secondary mx-auto mb-2" />
          <p className="text-text-secondary text-sm">No matching expenses</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
            className="mt-2 text-xs text-primary hover:text-primary-light transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {hasActiveFilters && (
            <p className="text-xs text-text-secondary px-1">
              {filteredExpenses.length} of {visibleExpenses.length} expenses
            </p>
          )}
          {[...filteredExpenses].reverse().map((expense) => {
            const Icon = CATEGORY_ICONS[expense.category] ?? ReceiptText;
            const colorClass = CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS['general']!;

            return (
              <div
                key={expense.id}
                className="bg-surface rounded-xl border border-border p-3 flex items-center gap-3 group hover:border-border/80 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {expense.description}
                    </p>
                    <p className="text-sm font-semibold text-text-primary shrink-0 ml-2">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-text-secondary min-w-0">
                      <span className="flex items-center gap-0.5 shrink-0">
                        <Calendar size={11} className="-mt-0.5" />
                        {new Date(expense.date || expense.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="shrink-0">·</span>
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
                          Paid by <span className="text-primary-light underline decoration-dotted underline-offset-2">{getMemberName(expense.paidBy)}</span>
                        </button>
                        {openPaidByDropdown === expense.id && (
                          <div
                            role="listbox"
                            aria-label="Select who paid"
                            className="absolute left-0 top-full mt-1 z-50 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px] animate-fade-in"
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
                                className={`w-full text-left px-3 py-2 text-sm transition-colors min-h-[44px] flex items-center ${
                                  member.id === expense.paidBy
                                    ? 'text-primary-light bg-primary/10'
                                    : 'text-text-primary hover:bg-white/5'
                                }`}
                              >
                                {member.name}
                                {member.id === expense.paidBy && <span className="ml-auto text-primary-light">&#10003;</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </span>
                      <span className="hidden sm:inline shrink-0">·</span>
                      <span className="hidden sm:inline shrink-0">{expense.splitType === 'equal' ? 'Equal' : 'Custom'} · {expense.participants.length} people</span>
                    </div>
                    <div className="flex items-center shrink-0 gap-0 sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        onClick={() => onEdit(expense)}
                        aria-label={`Edit expense: ${expense.description}`}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded text-text-secondary hover:text-primary transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleRemove(expense)}
                        aria-label={`Delete expense: ${expense.description}`}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded text-text-secondary hover:text-danger transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
