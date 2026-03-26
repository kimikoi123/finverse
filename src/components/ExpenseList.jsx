import { Trash2, Utensils, Car, Home, Ticket, ShoppingBag, ReceiptText, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/currencies';

const CATEGORY_ICONS = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  activities: Ticket,
  shopping: ShoppingBag,
  general: ReceiptText,
};

const CATEGORY_COLORS = {
  food: 'text-orange-400 bg-orange-400/15',
  transport: 'text-blue-400 bg-blue-400/15',
  accommodation: 'text-purple-400 bg-purple-400/15',
  activities: 'text-green-400 bg-green-400/15',
  shopping: 'text-pink-400 bg-pink-400/15',
  general: 'text-gray-400 bg-gray-400/15',
};

export default function ExpenseList({ expenses, members, onRemove }) {
  const getMemberName = (id) => members.find((m) => m.id === id)?.name || 'Unknown';

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8">
        <ReceiptText size={32} className="text-text-secondary mx-auto mb-2" />
        <p className="text-text-secondary text-sm">No expenses yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {[...expenses].reverse().map((expense) => {
        const Icon = CATEGORY_ICONS[expense.category] || ReceiptText;
        const colorClass = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.general;

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
                  <Calendar size={11} className="inline -mt-0.5 mr-0.5" />
                  {new Date(expense.date || expense.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {' · '}
                  Paid by <span className="text-primary-light">{getMemberName(expense.paidBy)}</span>
                  {' · '}
                  {expense.splitType === 'equal' ? 'Equal' : 'Custom'} split
                  {' · '}
                  {expense.participants.length} people
                </p>
                <button
                  onClick={() => onRemove(expense.id)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-text-secondary hover:text-danger transition-colors sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
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
