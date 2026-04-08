import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { formatCurrency } from '../utils/currencies';
import { parseAmountInput, isKNotation } from '../utils/amountParser';
import type { Account } from '../types';

interface TransferFormProps {
  fromAccount: Account;
  accounts: Account[];
  onSave: (fromId: string, toId: string, amount: number) => void;
  onCancel: () => void;
}

export default function TransferForm({
  fromAccount,
  accounts,
  onSave,
  onCancel,
}: TransferFormProps) {
  const [amount, setAmount] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const eligibleAccounts = accounts.filter(
    (a) => a.id !== fromAccount.id && a.currency === fromAccount.currency,
  );

  const selectedTo = eligibleAccounts.find((a) => a.id === toAccountId);
  const parsedAmount = parseAmountInput(amount);
  const canSave = parsedAmount > 0 && toAccountId !== '';

  const handleSave = () => {
    if (!canSave) return;
    onSave(fromAccount.id, toAccountId, parsedAmount);
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-primary/5 border-b border-primary/10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-start text-text-secondary active:opacity-60 transition-opacity"
          >
            <X size={20} />
          </button>
          <h1 className="text-base font-semibold text-text-primary">
            Transfer
          </h1>
          <div className="min-w-[44px]" />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* From account card */}
        <div className="px-4 pt-6">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
            From
          </span>
          <div
            className="rounded-xl p-4 border"
            style={{
              borderColor: fromAccount.color,
              backgroundColor: `${fromAccount.color}10`,
            }}
          >
            <div className="text-sm font-semibold text-text-primary">
              {fromAccount.name}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">
              {formatCurrency(fromAccount.balance, fromAccount.currency)}
            </div>
          </div>
        </div>

        {/* To account selector */}
        <div className="px-4 pt-6">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">
            To
          </span>

          {eligibleAccounts.length === 0 ? (
            <div className="rounded-xl p-4 border border-border bg-surface text-sm text-text-secondary text-center">
              No other accounts with the same currency
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown((prev) => !prev)}
                className="w-full flex items-center justify-between bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary transition-all hover:bg-surface-light"
              >
                <span>
                  {selectedTo ? selectedTo.name : 'Select account'}
                </span>
                <ChevronDown size={16} className="text-text-secondary" />
              </button>

              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {eligibleAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setToAccountId(acc.id);
                          setShowDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          toAccountId === acc.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-text-primary hover:bg-surface-light'
                        }`}
                      >
                        <span className="font-medium">{acc.name}</span>
                        <span className="text-text-secondary text-xs ml-2">
                          {formatCurrency(acc.balance, acc.currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Amount input */}
        <div className="flex flex-col items-center py-8 px-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-3">
            Amount
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Transfer amount"
            className="w-full text-4xl font-bold text-text-primary text-center bg-transparent border-none outline-none placeholder:text-text-secondary/30"
            autoFocus
          />
          {isKNotation(amount) && (
            <p className="text-[11px] text-primary/70 mt-1">= {parsedAmount.toLocaleString()}</p>
          )}
        </div>
      </div>

      {/* Sticky Save Footer */}
      <div
        className="flex-shrink-0 px-4 pt-3 pb-3 border-t border-border/30 bg-bg"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`w-full rounded-2xl py-3.5 font-semibold text-sm transition-all ${
            canSave
              ? 'bg-primary text-white active:opacity-80'
              : 'bg-primary/40 text-white/50 cursor-not-allowed'
          }`}
        >
          Save
        </button>
      </div>
    </div>
  );
}
