import { describe, it, expect } from 'vitest';
import { parseISODateLocal } from './dates';

describe('parseISODateLocal', () => {
  it('parses a calendar date as local midnight', () => {
    const d = parseISODateLocal('2026-08-31');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 7, 31, 0]);
  });

  it('parses a full timestamp (e.g. settledAt) instead of returning Invalid Date', () => {
    const iso = '2026-08-31T04:00:00.000Z';
    const d = parseISODateLocal(iso);
    expect(Number.isNaN(d.getTime())).toBe(false);
    expect(d.getTime()).toBe(new Date(iso).getTime());
  });

  it('returns Invalid Date for malformed input', () => {
    expect(Number.isNaN(parseISODateLocal('nope').getTime())).toBe(true);
  });
});
