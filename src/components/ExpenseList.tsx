import { useState } from 'react';
import { Trash2, Utensils, Car, Home, Ticket, ShoppingBag, ReceiptText } from 'lucide-react';
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

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  onRemove: (id: string) => void;
  showToast: (message: string, onCommit: () => void) => string;
}

export default function ExpenseList({ expenses, members, onRemove, showToast }: ExpenseListProps) {
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
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

  const visibleExpenses = expenses.filter((e) => !pendingDeletes.has(e.id));

  if (visibleExpenses.length === 0 && expenses.length === 0) {
    return (
      <div className="text-center py-8">
        <ReceiptText size={32} className="text-text-secondary mx-auto mb-2" />
        <p className="text-text-secondary text-sm">No expenses yet</p>
      </div>
    );
  }

  if (visibleExpenses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary text-sm">All expenses pending deletion...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {[...visibleExpenses].reverse().map((expense) => {
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
                <p className="text-xs text-text-secondary truncate">
                  Paid by <span className="text-primary-light">{getMemberName(expense.paidBy)}</span>
                  {' · '}
                  {expense.splitType === 'equal' ? 'Equal' : 'Custom'} split
                  {' · '}
                  {expense.participants.length} people
                </p>
                <button
                  onClick={() => handleRemove(expense)}
                  className="p-1 rounded text-text-secondary hover:text-danger transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
