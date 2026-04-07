import { useState, useMemo } from 'react';
import { ArrowLeft, Pencil, Trash2, TrendingUp, Inbox, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Account, Transaction } from '../types';
import { formatCurrency } from '../utils/currencies';
import { getInstitution, getInstitutionInitials } from '../utils/institutions';
import { getFinanceCategoryDef } from '../utils/categories';
import { computeForecast } from '../utils/forecast';
import AccountCharts from './AccountCharts';

interface AccountDetailProps {
  account: Account;
  transactions: Transaction[];
  defaultCurrency: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: () => void;
  onUpdatePrice: (price: number) => void;
  onRefreshCryptoPrice: () => void;
  refreshingPrice?: boolean;
}

function InstitutionBadge({ institution, name }: { institution?: string; name: string }) {
  const inst = institution ? getInstitution(institution) : null;
  const initials = getInstitutionInitials(inst?.name ?? name);
  return (
    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
      {initials}
    </div>
  );
}

function getTypeLabel(type: Account['type']): string {
  switch (type) {
    case 'debit': return 'Debit';
    case 'credit': return 'Credit';
    case 'ewallet': return 'E-wallet';
    case 'stocks': return 'Stocks';
    case 'crypto': return 'Crypto';
    default: return type;
  }
}

function computeDisplayBalance(account: Account): number {
  if (account.type === 'stocks' || account.type === 'crypto') {
    return (account.units ?? 0) * (account.pricePerUnit ?? 0);
  }
  return account.balance;
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const catDef = getFinanceCategoryDef(transaction.category);
  const isIncome = transaction.type === 'income';
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-base shrink-0">
        {catDef.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{transaction.description || catDef.label}</p>
        <p className="text-xs text-text-secondary">{catDef.label}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${isIncome ? 'text-success' : 'text-danger'}`}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
        </p>
        <p className="text-[10px] text-text-secondary">{transaction.date}</p>
      </div>
    </div>
  );
}

export default function AccountDetail({
  account,
  transactions,
  defaultCurrency,
  onBack,
  onEdit,
  onDelete,
  onTransfer,
  onUpdatePrice,
  onRefreshCryptoPrice,
  refreshingPrice,
}: AccountDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [priceInputValue, setPriceInputValue] = useState('');

  const linkedTransactions = useMemo(() =>
    transactions
      .filter((t) => t.accountId === account.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20),
    [transactions, account.id]
  );

  const displayBalance = computeDisplayBalance(account);
  const typeLabel = getTypeLabel(account.type);
  const isInvestment = account.type === 'stocks' || account.type === 'crypto';
  const showForecast = !isInvestment;

  const forecast = useMemo(() => {
    if (!showForecast) return null;
    return computeForecast(transactions, account.id, account.balance);
  }, [transactions, account.id, account.balance, showForecast]);

  const handlePriceSave = () => {
    const val = parseFloat(priceInputValue);
    if (val > 0) {
      onUpdatePrice(val);
      setShowPriceInput(false);
      setPriceInputValue('');
    }
  };

  return (
    <div className="animate-slide-in-right h-full flex flex-col">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center" aria-label="Go back">
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center" aria-label="Edit account">
            <Pencil className="w-4 h-4 text-text-primary" />
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center" aria-label="Delete account">
            <Trash2 className="w-4 h-4 text-danger" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {/* Account Card Hero */}
        <div className="rounded-2xl p-6 mx-4 mt-4" style={{ backgroundColor: account.color }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {isInvestment ? (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              ) : (
                <InstitutionBadge institution={account.institution} name={account.name} />
              )}
              <span className="font-semibold text-white">{account.name}</span>
            </div>
            <span className="text-xs text-white/80 bg-white/20 rounded-lg px-2 py-0.5">{typeLabel}</span>
          </div>
          <div className="mt-6">
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Balance</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {formatCurrency(displayBalance, account.currency)}
            </p>
          </div>
        </div>

        {/* Charts (linked transactions) */}
        <AccountCharts
          transactions={transactions}
          accountId={account.id}
          accountColor={account.color}
        />

        {/* Spendable + Forecast (non-investment only) */}
        {forecast && (
          <>
            <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
              <div className="bg-surface rounded-2xl border border-border p-4">
                <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Net Balance</p>
                <p className="text-lg font-bold text-text-primary mt-1">
                  {formatCurrency(account.balance, account.currency)}
                </p>
              </div>
              <div className="bg-surface rounded-2xl border border-border p-4">
                <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Spendable</p>
                <p className="text-lg font-bold text-text-primary mt-1">
                  {formatCurrency(forecast.spendable, account.currency)}
                </p>
              </div>
            </div>

            <div className="bg-surface rounded-2xl border border-border p-4 mx-4 mt-3">
              <p className="text-sm font-semibold text-text-primary mb-3">Next 30 days</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-light rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowDownLeft size={12} className="text-success" />
                    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Expected In</span>
                  </div>
                  <p className="text-base font-bold text-success">
                    +{formatCurrency(forecast.expectedIn, account.currency)}
                  </p>
                </div>
                <div className="bg-surface-light rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpRight size={12} className="text-danger" />
                    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Expected Out</span>
                  </div>
                  <p className="text-base font-bold text-danger">
                    -{formatCurrency(forecast.expectedOut, account.currency)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Investment Info */}
        {isInvestment && (
          <div className="bg-surface rounded-2xl border border-border p-4 mx-4 mt-4">
            {account.ticker && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Ticker</p>
                <p className="text-sm font-semibold text-text-primary mt-0.5">{account.ticker}</p>
              </div>
            )}
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Units Held</p>
                <p className="text-sm text-text-primary mt-0.5">{account.units ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Price per Unit</p>
                <p className="text-sm text-text-primary mt-0.5">
                  {formatCurrency(account.pricePerUnit ?? 0, account.currency)}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Total Value</p>
              <p className="text-xl font-bold text-text-primary mt-1">
                {formatCurrency(displayBalance, account.currency)}
              </p>
            </div>
            {account.currency !== defaultCurrency && (
              <p className="text-[10px] text-text-secondary mt-2">
                Values in {account.currency}. Default currency: {defaultCurrency}.
              </p>
            )}

            {/* Price action buttons */}
            <div className="mt-4 flex gap-2">
              {account.type === 'crypto' && (
                <button
                  onClick={onRefreshCryptoPrice}
                  disabled={refreshingPrice}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  <RefreshCw size={14} className={refreshingPrice ? 'animate-spin' : ''} />
                  {refreshingPrice ? 'Refreshing...' : 'Refresh Price'}
                </button>
              )}
              <button
                onClick={() => { setShowPriceInput(true); setPriceInputValue(String(account.pricePerUnit ?? '')); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-light border border-border text-text-primary rounded-xl text-sm font-medium"
              >
                Update Price
              </button>
            </div>

            {showPriceInput && (
              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  value={priceInputValue}
                  onChange={(e) => setPriceInputValue(e.target.value)}
                  placeholder="New price per unit"
                  className="flex-1 bg-surface border border-border rounded-xl py-2.5 px-3 text-sm text-text-primary"
                  autoFocus
                />
                <button
                  onClick={handlePriceSave}
                  className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowPriceInput(false)}
                  className="px-3 py-2.5 bg-surface-light text-text-secondary rounded-xl text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Credit Info */}
        {account.type === 'credit' && (
          <div className="bg-surface rounded-2xl border border-border p-4 mx-4 mt-4">
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Credit Limit</p>
            <p className="text-xl font-bold text-text-primary mt-1">
              {formatCurrency(account.creditLimit ?? 0, account.currency)}
            </p>
            <div className="mt-3">
              <div className="w-full h-2 rounded-full bg-surface-light">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${account.creditLimit ? Math.min((account.balance / account.creditLimit) * 100, 100) : 0}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-text-secondary">
                  {account.creditLimit ? Math.round((account.balance / account.creditLimit) * 100) : 0}% used
                </span>
                <span className="text-xs text-text-secondary">
                  {formatCurrency(Math.max((account.creditLimit ?? 0) - account.balance, 0), account.currency)} left
                </span>
              </div>
            </div>
            {account.dueDay != null && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Due Day</p>
                <p className="text-sm text-text-primary mt-0.5">Day {account.dueDay}</p>
              </div>
            )}
          </div>
        )}

        {/* Debit/E-wallet specific info */}
        {(account.type === 'debit' || account.type === 'ewallet') && account.interestRate != null && (
          <div className="bg-surface rounded-2xl border border-border p-4 mx-4 mt-4">
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Interest</p>
            <p className="text-sm text-text-primary mt-0.5">{account.interestRate}% yearly</p>
          </div>
        )}

        {/* Transfer Button (non-investment only) */}
        {!isInvestment && (
          <div className="mx-4 mt-4">
            <button
              onClick={onTransfer}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-surface border border-border rounded-2xl text-sm font-semibold text-text-primary hover:bg-surface-hover transition-colors"
            >
              <RefreshCw size={16} />
              Transfer money
            </button>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="bg-surface rounded-2xl border border-border p-4 mx-4 mt-4">
            <p className="text-sm font-semibold text-text-primary text-center">Delete {account.name}?</p>
            <p className="text-xs text-text-secondary text-center mt-1">This action cannot be undone.</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-surface-light text-text-primary rounded-xl py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={onDelete} className="flex-1 bg-danger text-white rounded-xl py-2.5 text-sm font-semibold">Delete</button>
            </div>
          </div>
        )}

        {/* Linked Transactions */}
        <div className="mx-4 mt-6">
          <h2 className="text-base font-semibold text-text-primary">Linked Transactions</h2>
          {linkedTransactions.length > 0 ? (
            <div className="mt-2 divide-y divide-border">
              {linkedTransactions.map((t) => (
                <TransactionRow key={t.id} transaction={t} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Inbox className="w-10 h-10 text-text-secondary/40 mb-2" />
              <p className="text-sm text-text-secondary">No linked transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
