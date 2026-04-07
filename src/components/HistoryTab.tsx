import { useState, useMemo } from 'react';
import { Search, X, Inbox } from 'lucide-react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currencies';
import { getFinanceCategoryDef } from '../utils/categories';

interface HistoryTabProps {
  transactions: Transaction[];
  defaultCurrency: string;
}

type FilterType = 'all' | 'income' | 'expense';

function getDateLabel(dateStr: string, todayStr: string, yesterdayStr: string): string {
  if (dateStr === todayStr) return 'TODAY';
  if (dateStr === yesterdayStr) return 'YESTERDAY';

  const date = new Date(dateStr + 'T00:00:00');
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  return `${weekday}, ${month} ${day}`;
}

export default function HistoryTab({ transactions, defaultCurrency }: HistoryTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (search.trim() !== '') {
        const query = search.trim().toLowerCase();
        if (!t.description.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [transactions, filter, search]);

  const groupedByDate = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const groups: { label: string; date: string; transactions: Transaction[] }[] = [];
    const dateMap = new Map<string, Transaction[]>();

    const sorted = [...filteredTransactions].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );

    for (const t of sorted) {
      const existing = dateMap.get(t.date);
      if (existing) {
        existing.push(t);
      } else {
        const arr = [t];
        dateMap.set(t.date, arr);
        groups.push({
          label: getDateLabel(t.date, todayStr, yesterdayStr),
          date: t.date,
          transactions: arr,
        });
      }
    }

    return groups;
  }, [filteredTransactions]);

  const hasNoTransactions = transactions.length === 0;
  const hasNoResults = !hasNoTransactions && filteredTransactions.length === 0;

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <h1 className="text-2xl font-bold text-text-primary tracking-tight" data-heading>
        History
      </h1>

      {/* Search bar */}
      <div className="mt-4 bg-surface border border-border rounded-xl flex items-center px-4 gap-2.5">
        <Search size={16} className="text-text-secondary shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions..."
          className="bg-transparent flex-1 text-sm text-text-primary placeholder:text-text-secondary py-2.5 outline-none"
        />
        {search.length > 0 && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mt-3">
        {(['all', 'income', 'expense'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={
              filter === type
                ? 'bg-primary text-white rounded-xl px-4 py-1.5 text-xs font-semibold'
                : 'bg-surface-light border border-border rounded-xl px-4 py-1.5 text-xs text-text-secondary'
            }
          >
            {type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expense'}
          </button>
        ))}
      </div>

      {/* Empty state: no transactions at all */}
      {hasNoTransactions && (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <Inbox size={40} className="text-text-secondary opacity-50" />
            <h2 className="text-lg font-semibold text-text-primary">No transactions yet</h2>
            <p className="text-sm text-text-secondary">
              Tap + to add your first expense or income
            </p>
          </div>
        </div>
      )}

      {/* Empty state: no search/filter results */}
      {hasNoResults && (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <Search size={36} className="text-text-secondary opacity-50" />
            <h2 className="text-lg font-semibold text-text-primary">No transactions found</h2>
            <p className="text-sm text-text-secondary">
              Try a different search or filter
            </p>
          </div>
        </div>
      )}

      {/* Transaction list grouped by date */}
      {groupedByDate.length > 0 && (
        <div className="mt-5 space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.date}>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider py-2">
                {group.label}
              </h3>
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                {group.transactions.map((t, idx) => {
                  const cat = getFinanceCategoryDef(t.category);
                  const isExpense = t.type === 'expense';
                  const isLast = idx === group.transactions.length - 1;

                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-3 py-3 px-4${
                        isLast ? '' : ' border-b border-border-subtle'
                      }`}
                    >
                      {/* Emoji icon */}
                      <div
                        className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center text-base shrink-0 ${
                          isExpense ? 'bg-danger/10' : 'bg-success/10'
                        }`}
                      >
                        {cat.emoji}
                      </div>

                      {/* Description + category */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {t.description}
                        </p>
                        <p className="text-xs text-text-secondary">{cat.label}</p>
                      </div>

                      {/* Amount */}
                      <span
                        className={`text-sm font-semibold shrink-0 ${
                          isExpense ? 'text-danger' : 'text-success'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatCurrency(t.amount, t.currency || defaultCurrency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
