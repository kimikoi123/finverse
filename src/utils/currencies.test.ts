import { describe, it, expect } from 'vitest';
import { convertToBase, formatCurrency, CURRENCIES } from './currencies';

describe('convertToBase', () => {
  it('same currency (USD->USD, 100) returns 100', () => {
    expect(convertToBase(100, 'USD', 'USD', { USD: 1 })).toBeCloseTo(100, 2);
  });

  it('zero amount returns 0', () => {
    expect(convertToBase(0, 'EUR', 'USD', { EUR: 0.92, USD: 1 })).toBeCloseTo(0, 2);
  });

  it('convert with explicit rates object EUR->USD', () => {
    const result = convertToBase(100, 'EUR', 'USD', { EUR: 0.92, USD: 1 });
    expect(result).toBeCloseTo(100 / 0.92 * 1, 2);
  });

  it('falls back to CURRENCIES when rates is null', () => {
    const result = convertToBase(100, 'EUR', 'USD', null);
    const expected = (100 / CURRENCIES.EUR!.rate) * CURRENCIES.USD!.rate;
    expect(result).toBeCloseTo(expected, 2);
  });

  it('falls back to CURRENCIES when rates is undefined', () => {
    const result = convertToBase(100, 'EUR', 'USD', undefined as unknown as null);
    const expected = (100 / CURRENCIES.EUR!.rate) * CURRENCIES.USD!.rate;
    expect(result).toBeCloseTo(expected, 2);
  });

  it('unknown fromCurrency with rates defaults to rate 1', () => {
    const result = convertToBase(100, 'FAKE', 'USD', { USD: 1 });
    // FAKE rate defaults to 1, so 100 / 1 * 1 = 100
    expect(result).toBeCloseTo(100, 2);
  });

  it('unknown baseCurrency with rates defaults to rate 1', () => {
    const result = convertToBase(100, 'USD', 'FAKE', { USD: 1 });
    // USD rate = 1, FAKE rate defaults to 1, so 100 / 1 * 1 = 100
    expect(result).toBeCloseTo(100, 2);
  });

  it('cross-currency EUR->JPY via hardcoded rates', () => {
    const result = convertToBase(100, 'EUR', 'JPY', { EUR: 0.92, JPY: 149.5 });
    expect(result).toBeCloseTo((100 / 0.92) * 149.5, 2);
  });

  it('negative amount works correctly', () => {
    const result = convertToBase(-50, 'EUR', 'USD', { EUR: 0.92, USD: 1 });
    expect(result).toBeCloseTo(-50 / 0.92 * 1, 2);
  });
});

describe('formatCurrency', () => {
  it('USD: formatCurrency(1234.56, "USD") returns "$1234.56"', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1234.56');
  });

  it('EUR: formatCurrency(99.9, "EUR") returns "€99.90"', () => {
    expect(formatCurrency(99.9, 'EUR')).toBe('€99.90');
  });

  it('JPY: large-value, no decimals, starts with yen symbol and contains 1235 (rounded)', () => {
    const result = formatCurrency(1234.56, 'JPY');
    expect(result).toContain('\u00a5');
    expect(result.replace(/[^0-9]/g, '')).toBe('1235');
  });

  it('KRW: starts with won symbol', () => {
    const result = formatCurrency(1234.56, 'KRW');
    expect(result).toContain('\u20a9');
    expect(result.replace(/[^0-9]/g, '')).toBe('1235');
  });

  it('unknown currency: formatCurrency(42, "FAKE") returns "42.00"', () => {
    expect(formatCurrency(42, 'FAKE')).toBe('42.00');
  });

  it('zero: formatCurrency(0, "USD") returns "$0.00"', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('negative: formatCurrency(-10.5, "USD") returns "$-10.50"', () => {
    expect(formatCurrency(-10.5, 'USD')).toBe('$-10.50');
  });
});
