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
  isSettlement?: boolean;
  createdAt: string;
}

export interface Trip {
  id: string;
  name: string;
  baseCurrency: string;
  members: Member[];
  expenses: Expense[];
  createdAt: string;
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

export interface TripState {
  trips: Trip[];
  activeTripId: string | null;
}
