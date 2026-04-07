import { useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import type { Account } from '../types';
import { formatCurrency, CURRENCIES } from '../utils/currencies';
import { getInstitution, getInstitutionInitials } from '../utils/institutions';

interface WalletTabProps {
  accounts: Account[];
  netWorth: number;
  defaultCurrency: string;
  onAddAccount: () => void;
  onSelectAccount: (id: string) => void;
}

type FilterType = 'all' | 'debit' | 'credit' | 'investments';

function InstitutionBadge({ institution, name }: { institution?: string; name: string }) {
  const inst = institution ? getInstitution(institution) : null;
  const initials = getInstitutionInitials(inst?.name ?? name);
  return (
    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
      {initials}
    </div>
  );
}

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'debit', label: 'Debit' },
  { key: 'credit', label: 'Credit' },
  { key: 'investments', label: 'Investments' },
];

function filterAccounts(accounts: Account[], filter: FilterType): Account[] {
  switch (filter) {
    case 'debit':
      return accounts.filter((a) => a.type === 'debit' || a.type === 'ewallet');
    case 'credit':
      return accounts.filter((a) => a.type === 'credit');
    case 'investments':
      return accounts.filter((a) => a.type === 'stocks' || a.type === 'crypto');
    default:
      return accounts;
  }
}

function DebitCard({ account, onClick }: { account: Account; onClick: () => void }) {
  const typeLabel = account.type === 'ewallet' ? 'E-wallet' : 'Debit';
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl p-4 min-h-[140px] flex flex-col justify-between text-left hover:brightness-110 active:scale-[0.99] transition-all"
      style={{ backgroundColor: account.color }}
    >
      <div>
        <div className="flex items-center gap-2">
          <InstitutionBadge institution={account.institution} name={account.name} />
          <span className="font-semibold text-sm text-white">{account.name}</span>
        </div>
        <p className="text-xs text-white/70 mt-1">
          {typeLabel} &bull; {account.currency}
        </p>
      </div>
      <div>
        <p className="text-[10px] text-white/60 uppercase">Balance</p>
        <p className="text-lg font-bold text-white">
          {formatCurrency(account.balance, account.currency)}
        </p>
        {account.interestRate != null && (
          <p className="text-[10px] text-white/60">{account.interestRate}% yearly</p>
        )}
      </div>
    </button>
  );
}

function CreditCard({ account, onClick }: { account: Account; onClick: () => void }) {
  const limit = account.creditLimit ?? 0;
  const usagePercent = limit > 0 ? Math.min((account.balance / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - account.balance, 0);
  const currencySymbol = CURRENCIES[account.currency]?.symbol ?? '';

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl p-4 min-h-[140px] flex flex-col justify-between text-left hover:brightness-110 active:scale-[0.99] transition-all"
      style={{ backgroundColor: account.color }}
    >
      <div>
        <div className="flex items-center gap-2">
          <InstitutionBadge institution={account.institution} name={account.name} />
          <span className="font-semibold text-sm text-white flex-1">{account.name}</span>
          <span className="text-white/50 text-sm">...</span>
        </div>
        <p className="text-xs text-white/70 mt-1">
          Credit &bull; {account.currency}
          {account.dueDay != null && <> &bull; due day {account.dueDay}</>}
        </p>
      </div>
      <div>
        <div className="w-full h-1.5 rounded-full bg-white/20 mt-2">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-white/60">{Math.round(usagePercent)}% used</span>
          <span className="text-[10px] text-white/60">
            {currencySymbol}{remaining.toLocaleString()} left
          </span>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-white/60 uppercase">Used Credit</p>
        <p className="text-lg font-bold text-white">
          {formatCurrency(account.balance, account.currency)}
        </p>
      </div>
    </button>
  );
}

function InvestmentCard({ account, onClick }: { account: Account; onClick: () => void }) {
  const typeLabel = account.type === 'crypto' ? 'Crypto' : 'Stocks';
  const units = account.units ?? 0;
  const pricePerUnit = account.pricePerUnit ?? 0;
  const totalValue = units * pricePerUnit;

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl p-4 min-h-[140px] flex flex-col justify-between text-left hover:brightness-110 active:scale-[0.99] transition-all"
      style={{ backgroundColor: account.color }}
    >
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-white" />
          <span className="font-semibold text-sm text-white">{account.name}</span>
        </div>
        <p className="text-xs text-white/70 mt-1">
          {typeLabel}
          {account.ticker && <> &bull; {account.ticker}</>}
          {' '}&bull; {account.currency}
        </p>
      </div>
      <div>
        <p className="text-[10px] text-white/60 uppercase">Balance</p>
        <p className="text-lg font-bold text-white">
          {formatCurrency(totalValue, account.currency)}
        </p>
        <p className="text-[10px] text-white/60">
          {units} units &bull; {formatCurrency(pricePerUnit, account.currency)}
        </p>
      </div>
    </button>
  );
}

function AccountCard({ account, onSelect }: { account: Account; onSelect: (id: string) => void }) {
  const handleClick = () => onSelect(account.id);

  switch (account.type) {
    case 'credit':
      return <CreditCard account={account} onClick={handleClick} />;
    case 'stocks':
    case 'crypto':
      return <InvestmentCard account={account} onClick={handleClick} />;
    default:
      return <DebitCard account={account} onClick={handleClick} />;
  }
}

export default function WalletTab({
  accounts,
  netWorth,
  defaultCurrency,
  onAddAccount,
  onSelectAccount,
}: WalletTabProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const filtered = filterAccounts(accounts, filter);

  if (accounts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-fade-in">
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="text-5xl">💳</span>
            <h2 className="text-xl font-bold text-text-primary" data-heading>
              No accounts yet
            </h2>
            <p className="text-sm text-text-secondary text-center">
              Add your first account to start tracking
            </p>
            <button
              type="button"
              onClick={onAddAccount}
              className="bg-primary text-white rounded-2xl px-6 py-3 font-semibold text-sm mt-2"
            >
              Add Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-text-primary" data-heading>
          Accounts
        </h1>
        <button
          type="button"
          onClick={onAddAccount}
          className="bg-primary/10 text-primary rounded-xl px-4 py-2 font-semibold text-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Net Worth Card */}
      <div className="bg-surface rounded-2xl border border-border p-5 mb-4">
        <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
          Net Worth
        </p>
        <p className="text-3xl font-bold text-text-primary mt-1">
          {formatCurrency(netWorth, defaultCurrency)}
        </p>
        <p className="text-xs text-text-secondary mt-1">Debit balances and investments</p>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilter(opt.key)}
            className={
              filter === opt.key
                ? 'bg-primary text-white rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap'
                : 'bg-surface border border-border rounded-xl px-4 py-1.5 text-xs text-text-secondary whitespace-nowrap'
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((account) => (
          <AccountCard key={account.id} account={account} onSelect={onSelectAccount} />
        ))}
      </div>
    </div>
  );
}
