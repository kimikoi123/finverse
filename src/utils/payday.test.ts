import { describe, it, expect, vi, afterEach } from 'vitest';
import { getPaydayOccurrences, getNearestPayday } from './payday';
import type {
  PaydayConfigMonthly,
  PaydayConfigSemiMonthly,
  PaydayConfigBiweekly,
  PaydayConfigWeekly,
} from '../types';

function day(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

describe('getPaydayOccurrences', () => {
  describe('monthly', () => {
    const config: PaydayConfigMonthly = { frequency: 'monthly', day: 15, amount: 10000, currency: 'PHP' };

    it('returns one occurrence when payday falls within window', () => {
      const result = getPaydayOccurrences(config, day(2026, 4, 1), day(2026, 4, 30));
      expect(result).toHaveLength(1);
      expect(result[0].date).toEqual(day(2026, 4, 15));
      expect(result[0].amount).toBe(10000);
    });

    it('returns two occurrences when window spans two months', () => {
      const result = getPaydayOccurrences(config, day(2026, 4, 1), day(2026, 5, 31));
      expect(result).toHaveLength(2);
      expect(result[0].date).toEqual(day(2026, 4, 15));
      expect(result[1].date).toEqual(day(2026, 5, 15));
    });

    it('returns empty when payday is before window', () => {
      const result = getPaydayOccurrences(config, day(2026, 4, 16), day(2026, 4, 30));
      expect(result).toHaveLength(0);
    });
  });

  describe('semi-monthly', () => {
    const config: PaydayConfigSemiMonthly = {
      frequency: 'semi-monthly', day1: 15, amount1: 12000, day2: 30, amount2: 15000, currency: 'PHP',
    };

    it('returns both paydays within a full month window', () => {
      const result = getPaydayOccurrences(config, day(2026, 4, 1), day(2026, 4, 30));
      expect(result).toHaveLength(2);
      expect(result[0].date).toEqual(day(2026, 4, 15));
      expect(result[0].amount).toBe(12000);
      expect(result[1].date).toEqual(day(2026, 4, 30));
      expect(result[1].amount).toBe(15000);
    });

    it('returns only the one that falls in a partial window', () => {
      const result = getPaydayOccurrences(config, day(2026, 4, 20), day(2026, 4, 30));
      expect(result).toHaveLength(1);
      expect(result[0].date).toEqual(day(2026, 4, 30));
    });
  });

  describe('biweekly', () => {
    const config: PaydayConfigBiweekly = {
      frequency: 'biweekly', refDate: '2026-04-03', amount: 8000, currency: 'PHP',
    };

    it('returns occurrences every 14 days from refDate within window', () => {
      const result = getPaydayOccurrences(config, day(2026, 4, 1), day(2026, 5, 1));
      expect(result).toHaveLength(3);
      expect(result[0].date).toEqual(day(2026, 4, 3));
      expect(result[1].date).toEqual(day(2026, 4, 17));
      expect(result[2].date).toEqual(day(2026, 5, 1));
    });

    it('works when refDate is in the past', () => {
      const result = getPaydayOccurrences(config, day(2026, 5, 1), day(2026, 5, 31));
      expect(result).toHaveLength(3);
      expect(result[0].date).toEqual(day(2026, 5, 1));
      expect(result[1].date).toEqual(day(2026, 5, 15));
      expect(result[2].date).toEqual(day(2026, 5, 29));
    });
  });

  describe('weekly', () => {
    const config: PaydayConfigWeekly = {
      frequency: 'weekly', refDate: '2026-04-03', amount: 4000, currency: 'PHP',
    };

    it('returns occurrences every 7 days from refDate within window', () => {
      const result = getPaydayOccurrences(config, day(2026, 4, 1), day(2026, 4, 30));
      expect(result).toHaveLength(4);
      expect(result[0].date).toEqual(day(2026, 4, 3));
      expect(result[1].date).toEqual(day(2026, 4, 10));
      expect(result[2].date).toEqual(day(2026, 4, 17));
      expect(result[3].date).toEqual(day(2026, 4, 24));
    });
  });
});

describe('getNearestPayday', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('returns nearest payday for monthly config', () => {
    vi.useFakeTimers({ now: day(2026, 4, 10) });
    const config: PaydayConfigMonthly = { frequency: 'monthly', day: 15, amount: 10000, currency: 'PHP' };
    const result = getNearestPayday(config);
    expect(result).not.toBeNull();
    expect(result!.date).toEqual(day(2026, 4, 15));
    expect(result!.amount).toBe(10000);
    expect(result!.daysUntil).toBe(5);
  });

  it('returns the closer of two semi-monthly paydays', () => {
    vi.useFakeTimers({ now: day(2026, 4, 20) });
    const config: PaydayConfigSemiMonthly = {
      frequency: 'semi-monthly', day1: 15, amount1: 12000, day2: 30, amount2: 15000, currency: 'PHP',
    };
    const result = getNearestPayday(config);
    expect(result).not.toBeNull();
    expect(result!.date).toEqual(day(2026, 4, 30));
    expect(result!.amount).toBe(15000);
    expect(result!.daysUntil).toBe(10);
  });

  it('returns nearest biweekly payday', () => {
    vi.useFakeTimers({ now: day(2026, 4, 10) });
    const config: PaydayConfigBiweekly = {
      frequency: 'biweekly', refDate: '2026-04-03', amount: 8000, currency: 'PHP',
    };
    const result = getNearestPayday(config);
    expect(result).not.toBeNull();
    expect(result!.date).toEqual(day(2026, 4, 17));
    expect(result!.amount).toBe(8000);
    expect(result!.daysUntil).toBe(7);
  });

  it('returns null when config is undefined', () => {
    const result = getNearestPayday(undefined);
    expect(result).toBeNull();
  });
});
