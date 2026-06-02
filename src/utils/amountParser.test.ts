import { describe, it, expect } from 'vitest';
import { parseAmountInput, validateAmountInput, isKNotation } from './amountParser';

describe('parseAmountInput', () => {
  it('parses plain numbers', () => {
    expect(parseAmountInput('25000')).toBe(25000);
    expect(parseAmountInput('1200.50')).toBe(1200.5);
  });

  it('parses comma-grouped en-US amounts (regression: was truncating at comma)', () => {
    expect(parseAmountInput('25,000')).toBe(25000);
    expect(parseAmountInput('1,234,567.89')).toBe(1234567.89);
    expect(parseAmountInput('1,000')).toBe(1000);
    expect(parseAmountInput('1,200.50')).toBe(1200.5);
  });

  it('parses k-notation, including with grouping', () => {
    expect(parseAmountInput('25k')).toBe(25000);
    expect(parseAmountInput('1.5k')).toBe(1500);
    expect(parseAmountInput('1,2k')).toBe(12000); // grouping stripped → "12k"
  });

  it('returns 0 for empty/invalid/negative', () => {
    expect(parseAmountInput('')).toBe(0);
    expect(parseAmountInput('   ')).toBe(0);
    expect(parseAmountInput('abc')).toBe(0);
    expect(parseAmountInput('-5')).toBe(0);
  });
});

describe('validateAmountInput', () => {
  it('accepts comma-grouped amounts', () => {
    expect(validateAmountInput('25,000')).toEqual({ ok: true, value: 25000 });
    expect(validateAmountInput('1,234,567.89')).toEqual({ ok: true, value: 1234567.89 });
  });

  it('reports reasons for bad input', () => {
    expect(validateAmountInput('')).toEqual({ ok: false, reason: 'empty' });
    expect(validateAmountInput('abc')).toEqual({ ok: false, reason: 'invalid' });
    expect(validateAmountInput('-5')).toEqual({ ok: false, reason: 'negative' });
    expect(validateAmountInput('0')).toEqual({ ok: false, reason: 'zero' });
  });
});

describe('isKNotation', () => {
  it('detects k-notation regardless of grouping', () => {
    expect(isKNotation('5k')).toBe(true);
    expect(isKNotation('1,5k')).toBe(true);
    expect(isKNotation('500')).toBe(false);
  });
});
