import { useState, useCallback } from 'react';
import {
  ArrowLeft,
  Banknote,
  Building2,
  CreditCard,
  TrendingUp,
  CircleDollarSign,
  Check,
  ChevronDown,
} from 'lucide-react';
import type { Account, AccountType } from '../types';
import { CURRENCIES } from '../utils/currencies';
import { BANKS, EWALLETS, getInstitution } from '../utils/institutions';
import { getInstitutionInitials } from '../utils/institutions';
import { ACCOUNT_COLORS } from '../hooks/useAccounts';

interface AddAccountFlowProps {
  onSave: (data: Omit<Account, 'id' | 'createdAt' | 'sortOrder'>) => void;
  onCancel: () => void;
  editingAccount?: Account;
}

type CategoryChoice = 'cash' | 'bank' | 'credit' | 'stocks' | 'crypto';

interface CategoryOption {
  key: CategoryChoice;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    key: 'cash',
    label: 'Cash',
    description: 'Physical money on hand',
    icon: <Banknote size={22} />,
    iconBg: 'bg-green-500/15 text-green-400',
  },
  {
    key: 'bank',
    label: 'Bank Account',
    description: 'Savings or checking account',
    icon: <Building2 size={22} />,
    iconBg: 'bg-blue-500/15 text-blue-400',
  },
  {
    key: 'credit',
    label: 'Credit Card',
    description: 'Track credit usage and payments',
    icon: <CreditCard size={22} />,
    iconBg: 'bg-purple-500/15 text-purple-400',
  },
  {
    key: 'stocks',
    label: 'Stocks',
    description: 'Stock market investments',
    icon: <TrendingUp size={22} />,
    iconBg: 'bg-amber-500/15 text-amber-400',
  },
  {
    key: 'crypto',
    label: 'Crypto',
    description: 'Cryptocurrency holdings',
    icon: <CircleDollarSign size={22} />,
    iconBg: 'bg-orange-500/15 text-orange-400',
  },
];

function resolveAccountType(
  category: CategoryChoice,
  institutionKey?: string
): AccountType {
  if (category === 'cash') return 'debit';
  if (category === 'bank') {
    // If user picked an e-wallet institution, type is 'ewallet'
    if (institutionKey && EWALLETS.some((e) => e.key === institutionKey)) {
      return 'ewallet';
    }
    return 'debit';
  }
  if (category === 'credit') return 'credit';
  if (category === 'stocks') return 'stocks';
  return 'crypto';
}

function needsInstitutionStep(category: CategoryChoice): boolean {
  return category === 'bank' || category === 'credit';
}

export default function AddAccountFlow({
  onSave,
  onCancel,
  editingAccount,
}: AddAccountFlowProps) {
  // If editing, start at step 3 directly
  const initialStep = editingAccount ? 3 : 1;

  const [step, setStep] = useState(initialStep);
  const [category, setCategory] = useState<CategoryChoice | null>(() => {
    if (!editingAccount) return null;
    // Derive category from editing account
    if (editingAccount.type === 'credit') return 'credit';
    if (editingAccount.type === 'stocks') return 'stocks';
    if (editingAccount.type === 'crypto') return 'crypto';
    if (editingAccount.type === 'ewallet') return 'bank';
    // debit - check if it has an institution (bank) or not (cash)
    if (editingAccount.institution) return 'bank';
    return 'cash';
  });
  const [selectedInstitution, setSelectedInstitution] = useState<
    string | null
  >(() => editingAccount?.institution ?? null);

  // Form state
  const [name, setName] = useState(editingAccount?.name ?? '');
  const [currency, setCurrency] = useState(editingAccount?.currency ?? 'PHP');
  const [balance, setBalance] = useState(() =>
    editingAccount ? String(editingAccount.balance) : ''
  );
  const [color, setColor] = useState(
    () => editingAccount?.color ?? ACCOUNT_COLORS[0] ?? '#2d6a4f'
  );
  const [creditLimit, setCreditLimit] = useState(() =>
    editingAccount?.creditLimit != null
      ? String(editingAccount.creditLimit)
      : ''
  );
  const [dueDay, setDueDay] = useState(() =>
    editingAccount?.dueDay != null ? String(editingAccount.dueDay) : ''
  );
  const [ticker, setTicker] = useState(editingAccount?.ticker ?? '');
  const [units, setUnits] = useState(() =>
    editingAccount?.units != null ? String(editingAccount.units) : ''
  );
  const [pricePerUnit, setPricePerUnit] = useState(() =>
    editingAccount?.pricePerUnit != null
      ? String(editingAccount.pricePerUnit)
      : ''
  );
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const isStocksOrCrypto = category === 'stocks' || category === 'crypto';

  const canSave = (() => {
    if (!name.trim()) return false;
    if (isStocksOrCrypto) {
      return (
        ticker.trim().length > 0 &&
        parseFloat(units) > 0 &&
        parseFloat(pricePerUnit) > 0
      );
    }
    // Balance can be 0 or more
    const bal = parseFloat(balance);
    return !isNaN(bal) && bal >= 0;
  })();

  const handleCategorySelect = useCallback(
    (cat: CategoryChoice) => {
      setCategory(cat);
      if (needsInstitutionStep(cat)) {
        setStep(2);
      } else {
        // Skip institution, go to form
        // Pre-fill name defaults
        if (cat === 'cash') setName('Cash');
        if (cat === 'stocks') setName('');
        if (cat === 'crypto') setName('');
        setStep(3);
      }
    },
    []
  );

  const handleInstitutionSelect = useCallback(
    (institutionKey: string | null) => {
      setSelectedInstitution(institutionKey);
      if (institutionKey) {
        const inst = getInstitution(institutionKey);
        if (inst) {
          setName(inst.name);
        }
      } else {
        // "Other" selected
        setName('');
      }
      setStep(3);
    },
    []
  );

  const handleBack = useCallback(() => {
    if (step === 3) {
      if (editingAccount) {
        onCancel();
        return;
      }
      if (category && needsInstitutionStep(category)) {
        setStep(2);
      } else {
        setStep(1);
      }
    } else if (step === 2) {
      setStep(1);
    } else {
      onCancel();
    }
  }, [step, category, editingAccount, onCancel]);

  const handleSave = useCallback(() => {
    if (!canSave || !category) return;

    const accountType = resolveAccountType(category, selectedInstitution ?? undefined);
    const parsedBalance = parseFloat(balance) || 0;

    const data: Omit<Account, 'id' | 'createdAt' | 'sortOrder'> = {
      name: name.trim(),
      type: accountType,
      institution: selectedInstitution ?? undefined,
      currency,
      balance: parsedBalance,
      color,
    };

    if (accountType === 'credit') {
      const cl = parseFloat(creditLimit);
      if (!isNaN(cl) && cl > 0) data.creditLimit = cl;
      const dd = parseInt(dueDay, 10);
      if (!isNaN(dd) && dd >= 1 && dd <= 31) data.dueDay = dd;
    }

    if (category === 'stocks' || category === 'crypto') {
      data.ticker = ticker.trim().toUpperCase();
      data.units = parseFloat(units) || 0;
      data.pricePerUnit = parseFloat(pricePerUnit) || 0;
      data.balance = data.units * data.pricePerUnit;
    }

    onSave(data);
  }, [
    canSave,
    category,
    selectedInstitution,
    name,
    currency,
    balance,
    color,
    creditLimit,
    dueDay,
    ticker,
    units,
    pricePerUnit,
    onSave,
  ]);

  const stepTitle = (() => {
    if (step === 1) return 'Add Account';
    if (step === 2) return 'Choose Institution';
    if (editingAccount) return 'Edit Account';
    return 'Account Details';
  })();

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-text-secondary active:opacity-60 transition-opacity"
          >
            <ArrowLeft size={18} />
            <span>{step === 1 ? 'Cancel' : 'Back'}</span>
          </button>
          <h1 className="text-base font-semibold text-text-primary">
            {stepTitle}
          </h1>
          {step === 3 ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`text-sm font-semibold transition-opacity ${
                canSave
                  ? 'text-primary active:opacity-60'
                  : 'text-primary opacity-50 cursor-not-allowed'
              }`}
            >
              Save
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === 1 && (
          <StepTypeSelection onSelect={handleCategorySelect} />
        )}
        {step === 2 && category && (
          <StepInstitutionGrid
            category={category}
            onSelect={handleInstitutionSelect}
          />
        )}
        {step === 3 && (
          <StepDetailsForm
            category={category}
            isStocksOrCrypto={isStocksOrCrypto}
            name={name}
            setName={setName}
            currency={currency}
            setCurrency={setCurrency}
            showCurrencyDropdown={showCurrencyDropdown}
            setShowCurrencyDropdown={setShowCurrencyDropdown}
            balance={balance}
            setBalance={setBalance}
            color={color}
            setColor={setColor}
            creditLimit={creditLimit}
            setCreditLimit={setCreditLimit}
            dueDay={dueDay}
            setDueDay={setDueDay}
            ticker={ticker}
            setTicker={setTicker}
            units={units}
            setUnits={setUnits}
            pricePerUnit={pricePerUnit}
            setPricePerUnit={setPricePerUnit}
            canSave={canSave}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Step 1: Type Selection ──────────────────────────────────────── */

function StepTypeSelection({
  onSelect,
}: {
  onSelect: (cat: CategoryChoice) => void;
}) {
  return (
    <div className="px-4 py-6 space-y-3">
      <p className="text-sm text-text-secondary mb-4">
        What type of account would you like to add?
      </p>
      {CATEGORY_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onSelect(opt.key)}
          className="w-full flex items-center gap-4 bg-surface rounded-2xl border border-border p-4 active:scale-[0.98] transition-transform text-left"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${opt.iconBg}`}
          >
            {opt.icon}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text-primary">
              {opt.label}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">
              {opt.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Step 2: Institution Grid ────────────────────────────────────── */

function StepInstitutionGrid({
  category,
  onSelect,
}: {
  category: CategoryChoice;
  onSelect: (institutionKey: string | null) => void;
}) {
  const institutions =
    category === 'bank' ? [...BANKS, ...EWALLETS] : [...BANKS];

  return (
    <div className="px-4 py-6">
      <p className="text-sm text-text-secondary mb-4">
        {category === 'bank'
          ? 'Select your bank or e-wallet'
          : 'Select the card issuer'}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {institutions.map((inst) => (
          <button
            key={inst.key}
            type="button"
            onClick={() => onSelect(inst.key)}
            className="flex flex-col items-center gap-2 bg-surface rounded-2xl border border-border p-4 active:scale-[0.96] transition-transform"
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: inst.color }}
            >
              {getInstitutionInitials(inst.shortName ?? inst.name)}
            </div>
            <span className="text-xs text-text-primary text-center leading-tight font-medium truncate w-full">
              {inst.shortName ?? inst.name}
            </span>
          </button>
        ))}
        {/* "Other" option */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex flex-col items-center gap-2 bg-surface rounded-2xl border border-border p-4 active:scale-[0.96] transition-transform"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-text-secondary/20 text-text-secondary text-xs font-bold">
            ?
          </div>
          <span className="text-xs text-text-primary text-center leading-tight font-medium">
            Other
          </span>
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Details Form ────────────────────────────────────────── */

interface StepDetailsFormProps {
  category: CategoryChoice | null;
  isStocksOrCrypto: boolean;
  name: string;
  setName: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  showCurrencyDropdown: boolean;
  setShowCurrencyDropdown: (v: boolean) => void;
  balance: string;
  setBalance: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  creditLimit: string;
  setCreditLimit: (v: string) => void;
  dueDay: string;
  setDueDay: (v: string) => void;
  ticker: string;
  setTicker: (v: string) => void;
  units: string;
  setUnits: (v: string) => void;
  pricePerUnit: string;
  setPricePerUnit: (v: string) => void;
  canSave: boolean;
  onSave: () => void;
}

function StepDetailsForm({
  category,
  isStocksOrCrypto,
  name,
  setName,
  currency,
  setCurrency,
  showCurrencyDropdown,
  setShowCurrencyDropdown,
  balance,
  setBalance,
  color,
  setColor,
  creditLimit,
  setCreditLimit,
  dueDay,
  setDueDay,
  ticker,
  setTicker,
  units,
  setUnits,
  pricePerUnit,
  setPricePerUnit,
  canSave,
  onSave,
}: StepDetailsFormProps) {
  return (
    <div className="px-4 py-6 space-y-6 pb-10">
      {/* Account Name */}
      <div>
        <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
          Account Name
        </label>
        <input
          type="text"
          placeholder="e.g. BPI Savings"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Account name"
          className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
          autoFocus
        />
      </div>

      {/* Currency */}
      <div>
        <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
          Currency
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
            className="w-full flex items-center justify-between bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary transition-all hover:bg-surface-light"
          >
            <span>
              {CURRENCIES[currency]?.symbol ?? ''} {currency} &mdash;{' '}
              {CURRENCIES[currency]?.name ?? ''}
            </span>
            <ChevronDown
              size={16}
              className="text-text-secondary flex-shrink-0"
            />
          </button>

          {showCurrencyDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowCurrencyDropdown(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {Object.entries(CURRENCIES).map(([code, config]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setCurrency(code);
                      setShowCurrencyDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      currency === code
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-text-primary hover:bg-surface-light'
                    }`}
                  >
                    {config.symbol} {code}{' '}
                    <span className="text-text-secondary text-xs">
                      {config.name}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ticker (stocks / crypto) */}
      {isStocksOrCrypto && (
        <div>
          <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
            {category === 'stocks' ? 'Ticker Symbol' : 'Coin Symbol'}
          </label>
          <input
            type="text"
            placeholder={category === 'stocks' ? 'e.g. AAPL' : 'e.g. BTC'}
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            aria-label={
              category === 'stocks' ? 'Ticker symbol' : 'Coin symbol'
            }
            className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all uppercase"
          />
        </div>
      )}

      {/* Number of Units (stocks / crypto) */}
      {isStocksOrCrypto && (
        <div>
          <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
            Number of Units
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            aria-label="Number of units"
            className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      )}

      {/* Price Per Unit (stocks / crypto) */}
      {isStocksOrCrypto && (
        <div>
          <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
            Price Per Unit
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0.00"
            value={pricePerUnit}
            onChange={(e) => setPricePerUnit(e.target.value)}
            aria-label="Price per unit"
            className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {parseFloat(units) > 0 && parseFloat(pricePerUnit) > 0 && (
            <p className="text-xs text-text-secondary mt-2">
              Total value:{' '}
              {CURRENCIES[currency]?.symbol ?? ''}
              {(parseFloat(units) * parseFloat(pricePerUnit)).toLocaleString(
                undefined,
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}
            </p>
          )}
        </div>
      )}

      {/* Starting Balance (non stocks/crypto) */}
      {!isStocksOrCrypto && (
        <div>
          <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
            {category === 'credit' ? 'Current Balance' : 'Starting Balance'}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg text-text-secondary font-medium">
              {CURRENCIES[currency]?.symbol ?? ''}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              aria-label="Starting balance"
              className="flex-1 bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>
      )}

      {/* Credit Card specific fields */}
      {category === 'credit' && (
        <>
          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Credit Limit
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg text-text-secondary font-medium">
                {CURRENCIES[currency]?.symbol ?? ''}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                aria-label="Credit limit"
                className="flex-1 bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 block">
              Due Day (1-31)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              placeholder="e.g. 15"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              aria-label="Due day"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </>
      )}

      {/* Card Color */}
      <div>
        <label className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-3 block">
          Card Color
        </label>
        <div className="flex items-center gap-3">
          {ACCOUNT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Select color ${c}`}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
              style={{
                backgroundColor: c,
                boxShadow:
                  color === c ? `0 0 0 3px var(--color-bg), 0 0 0 5px ${c}` : 'none',
              }}
            >
              {color === c && <Check size={16} className="text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className={`w-full rounded-2xl py-3.5 font-semibold text-sm transition-all ${
          canSave
            ? 'bg-primary text-white active:opacity-80'
            : 'bg-primary/40 text-white/50 cursor-not-allowed'
        }`}
      >
        {isStocksOrCrypto ? 'Add Investment' : 'Save Account'}
      </button>
    </div>
  );
}
