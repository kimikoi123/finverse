// Tags rows in the sync engine's push queue. Must match the `ALLOWED_TYPES`
// whitelist in `api/sync/push.ts` on the server.
export type SyncEntityType =
  | 'trip'
  | 'transaction'
  | 'account'
  | 'budget'
  | 'goal'
  | 'debt'
  | 'installment'
  | 'userPreferences'
  | 'receipt';

export interface CurrencyConfig {
  symbol: string;
  name: string;
  rate: number;
}

export interface Member {
  id: string;
  name: string;
}

export type SplitType = 'equal' | 'custom';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitType: SplitType;
  participants: string[];
  customAmounts: Record<string, number>;
  category: string;
  date?: string;
  advancePayments?: Record<string, number>;
  isSettlement?: boolean;
  createdAt: string;
}

export interface Trip {
  id: string;
  name: string;
  baseCurrency: string;
  members: Member[];
  expenses: Expense[];
  customCategories?: string[];
  createdAt: string;
  updatedAt?: number;
  deletedAt?: number;
}

export interface Debt {
  from: string;
  to: string;
  amount: number;
}

export type Balances = Record<string, number>;

export type ExchangeRates = Record<string, number>;

export type RateSource = 'api' | 'cache' | 'fallback';

export interface ExchangeRateResult {
  rates: ExchangeRates;
  timestamp: number | null;
  source: RateSource;
}

export interface DeletedTrip {
  trip: Trip;
  deletedAt: string;
}

export interface TripState {
  trips: Trip[];
  activeTripId: string | null;
}

// Personal finance types
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string; // ISO date "2026-04-06"
  createdAt: string;
  accountId?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency; // defaults to 'monthly' when absent
  recurringDay?: number;        // day of month 1-31 (monthly/quarterly/yearly)
  recurringDayOfWeek?: number;  // 0=Sun..6=Sat (weekly/biweekly)
  recurringMonth?: number;      // 1-12 (yearly)
  recurringCustomDates?: string[]; // ISO date strings (custom)
  recurringEndDate?: string;    // optional end date
  transferId?: string;      // links paired transfer transactions
  budgetId?: string;
  updatedAt?: number;
  deletedAt?: number;
}

// Account types
export type AccountType = 'debit' | 'credit' | 'ewallet' | 'stocks' | 'crypto';

export interface AccountGradient {
  id: string;
  from: string;
  to: string;
  angle?: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  currency: string;
  balance: number;
  color: string;
  gradient?: AccountGradient;
  creditLimit?: number;
  dueDay?: number;
  ticker?: string;
  units?: number;
  pricePerUnit?: number;
  interestRate?: number;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt?: number;
  deletedAt?: number;
}

// Budget types
export interface Budget {
  id: string;
  name: string;
  type: 'category' | 'custom';
  categoryKey?: string;
  monthlyLimit: number;
  currency: string;
  icon: string;
  color: string;
  preset?: string;
  createdAt: string;
  updatedAt?: number;
  deletedAt?: number;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserPreferences {
  id: string; // always 'default' (singleton row)
  displayName: string;
  defaultCurrency: string;
  theme: ThemePreference;
  onboardingComplete: boolean;
  paydayDay?: number;        // day of month (1-31)
  paydayAmount?: number;
  paydayCurrency?: string;
  privacyMode?: boolean;
  updatedAt?: number;
}

// Goal types
export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  linkedAccountId?: string;
  currency: string;
  deadline?: string;
  color: string;
  createdAt: string;
  updatedAt?: number;
  deletedAt?: number;
}

// Debt types
export type DebtDirection = 'i_owe' | 'owed_to_me';

export interface DebtEntry {
  id: string;
  personName: string;
  direction: DebtDirection;
  amount: number;
  paidAmount: number;
  currency: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: number;
  deletedAt?: number;
}

// Installment types
export interface Installment {
  id: string;
  itemName: string;
  totalAmount: number;
  monthlyPayment: number;
  totalMonths: number;
  paidMonths: number;
  startDate: string;
  creditCardAccountId?: string;
  currency: string;
  notes?: string;
  createdAt: string;
  updatedAt?: number;
  deletedAt?: number;
}
