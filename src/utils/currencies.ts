import type { CurrencyConfig, ExchangeRates } from '../types';

// Module-level privacy flag — initialized from localStorage to prevent flicker
let _privacyMode = (() => {
  try { return localStorage.getItem('privacy-mode') === 'true'; }
  catch { return false; }
})();

export function setPrivacyMode(enabled: boolean): void {
  _privacyMode = enabled;
}

export function isPrivacyMode(): boolean {
  return _privacyMode;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { symbol: '$', name: 'US Dollar', rate: 1 },
  EUR: { symbol: '€', name: 'Euro', rate: 0.92 },
  GBP: { symbol: '£', name: 'British Pound', rate: 0.79 },
  JPY: { symbol: '¥', name: 'Japanese Yen', rate: 149.5 },
  PHP: { symbol: '₱', name: 'Philippine Peso', rate: 55.8 },
  THB: { symbol: '฿', name: 'Thai Baht', rate: 35.2 },
  KRW: { symbol: '₩', name: 'South Korean Won', rate: 1320 },
  AUD: { symbol: 'A$', name: 'Australian Dollar', rate: 1.53 },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', rate: 1.36 },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', rate: 1.34 },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit', rate: 4.47 },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', rate: 15700 },
  VND: { symbol: '₫', name: 'Vietnamese Dong', rate: 24500 },
  INR: { symbol: '₹', name: 'Indian Rupee', rate: 83.1 },
  MXN: { symbol: 'MX$', name: 'Mexican Peso', rate: 17.15 },
};

export function convertToBase(amount: number, fromCurrency: string, baseCurrency: string, rates: ExchangeRates | null): number {
  const fromRate = rates ? (rates[fromCurrency] ?? 1) : (CURRENCIES[fromCurrency]?.rate ?? 1);
  const toRate = rates ? (rates[baseCurrency] ?? 1) : (CURRENCIES[baseCurrency]?.rate ?? 1);
  return (amount / fromRate) * toRate;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  if (_privacyMode) return '••••';
  return formatCurrencyRaw(amount, currencyCode);
}

export function formatCurrencyRaw(amount: number, currencyCode: string): string {
  const currency = CURRENCIES[currencyCode];
  if (!currency) return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // For currencies with large values, no decimals
  if (['JPY', 'KRW', 'IDR', 'VND'].includes(currencyCode)) {
    return `${currency.symbol}${Math.round(amount).toLocaleString()}`;
  }
  return `${currency.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
