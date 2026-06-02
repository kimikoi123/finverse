import { useState, useMemo } from 'react';
import { Search, X, Inbox, Pencil, Trash2, Download, Upload } from 'lucide-react';
import type { Transaction, Account } from '../types';
import { formatCurrency } from '../utils/currencies';
import { getFinanceCategoryDef } from '../utils/categories';
import { todayISO, yesterdayISO } from '../utils/dates';
import { TOAST_DURATION } from '../hooks/useToast';
import ExportSheet from './ExportSheet';
import ImportStatementSheet from './ImportStatementSheet';

interface HistoryTabProps {
  transactions: Transaction[];
  accounts: Account[];
  defaultCurrency: string;
  displayName: string;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onImport?: (txns: Omit<Transaction, 'id' | 'createdAt'>[]) => Promise<unknown>;
  showToast?: (message: string, onCommit?: () => void) => string;
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

export default function HistoryTab({ transactions, accounts, defaultCurrency, displayName, onEdit, onDelete, onImport, showToast }: HistoryTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);

  const handleDelete = (t: Transaction) => {
    if (!onDelete || !showToast) return;
    setPendingDeletes((prev) => new Set(prev).add(t.id));
    showToast(`"${t.description || 'Transaction'}" deleted`, () => {
      onDelete(t.id);
    });
    setTimeout(() => {
      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.delete(t.id);
        return next;
      });
    }, TOAST_DURATION + 500);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (pendingDeletes.has(t.id)) return false;
      if (filter !== 'all' && t.type !== filter) return false;
      if (search.trim() !== '') {
        const query = search.trim().toLowerCase();
        if (!t.description.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [transactions, filter, search, pendingDeletes]);

  const groupedByDate = useMemo(() => {
    // Local calendar dates — transaction dates are stored as local ISO, so
    // comparing against UTC slices mislabels TODAY/YESTERDAY in PHT (UTC+8).
    const todayStr = todayISO();
    const yesterdayStr = yesterdayISO();

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight" data-heading>
          History
        </h1>
        <div className="flex items-center gap-1">
          {onImport && (
            <button
              type="button"
              onClick={() => setShowImportSheet(true)}
              aria-label="Import transactions"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-primary active:opacity-60 transition-colors"
            >
              <Upload size={18} />
            </button>
          )}
          {transactions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowExportSheet(true)}
              aria-label="Export statement"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-primary active:opacity-60 transition-colors"
            >
              <Download size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="mt-4 bg-surface border border-border rounded-xl flex items-center px-4 gap-2.5">
        <Search size={16} className="text-text-secondary shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions..."
          aria-label="Search transactions"
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
            {onImport && (
              <button
                type="button"
                onClick={() => setShowImportSheet(true)}
                className="mt-2 flex items-center gap-1.5 bg-surface-light border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary hover:border-primary transition-colors"
              >
                <Upload size={14} />
                Or import a bank statement
              </button>
            )}
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

                      {/* Amount + actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-sm font-semibold ${
                            isExpense ? 'text-danger' : 'text-success'
                          }`}
                        >
                          {isExpense ? '-' : '+'}
                          {formatCurrency(t.amount, t.currency || defaultCurrency)}
                        </span>
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(t)}
                            aria-label="Edit transaction"
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-text-secondary hover:text-primary active:opacity-60 transition-colors rounded-lg"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {onDelete && showToast && (
                          <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            aria-label="Delete transaction"
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-text-secondary hover:text-danger active:opacity-60 transition-colors rounded-lg"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showExportSheet && (
        <ExportSheet
          transactions={transactions}
          accounts={accounts}
          defaultCurrency={defaultCurrency}
          displayName={displayName}
          onClose={() => setShowExportSheet(false)}
        />
      )}

      {showImportSheet && onImport && (
        <ImportStatementSheet
          accounts={accounts}
          existingTransactions={transactions}
          defaultCurrency={defaultCurrency}
          onImport={onImport}
          onClose={() => setShowImportSheet(false)}
          {...(showToast ? { showToast } : {})}
        />
      )}
    </div>
  );
}
