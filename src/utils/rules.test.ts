import { describe, it, expect } from 'vitest';
import { matchRule, applyRulesToParsed } from './rules';
import type { Rule } from '../types';

function rule(overrides: Partial<Rule>): Rule {
  return {
    id: overrides.id ?? 'r1',
    pattern: overrides.pattern ?? 'coffee',
    category: overrides.category ?? 'food',
    priority: overrides.priority ?? 100,
    enabled: overrides.enabled ?? true,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('matchRule', () => {
  it('returns null when rules list is empty', () => {
    expect(matchRule('anything', 'expense', undefined, [])).toBeNull();
  });

  it('matches case-insensitively on description substring', () => {
    const r = rule({ pattern: 'Starbucks', category: 'food' });
    expect(matchRule('morning STARBUCKS run', 'expense', undefined, [r])).toBe(r);
    expect(matchRule('nope', 'expense', undefined, [r])).toBeNull();
  });

  it('skips disabled rules', () => {
    const r = rule({ enabled: false });
    expect(matchRule('coffee', 'expense', undefined, [r])).toBeNull();
  });

  it('skips tombstoned rules', () => {
    const r = rule({ deletedAt: Date.now() });
    expect(matchRule('coffee', 'expense', undefined, [r])).toBeNull();
  });

  it('respects priority ordering (lower first)', () => {
    const low = rule({ id: 'a', pattern: 'dinner', category: 'food', priority: 0 });
    const high = rule({ id: 'b', pattern: 'dinner', category: 'entertainment', priority: 10 });
    expect(matchRule('late dinner', 'expense', undefined, [high, low])).toBe(low);
  });

  it('breaks priority ties by createdAt ascending', () => {
    const older = rule({ id: 'a', priority: 5, createdAt: '2026-01-01T00:00:00.000Z' });
    const newer = rule({ id: 'b', priority: 5, createdAt: '2026-06-01T00:00:00.000Z' });
    expect(matchRule('coffee', 'expense', undefined, [newer, older])).toBe(older);
  });

  it('applies type filter when rule specifies one', () => {
    const r = rule({ pattern: 'refund', category: 'refund', type: 'income' });
    expect(matchRule('store refund', 'income', undefined, [r])).toBe(r);
    expect(matchRule('store refund', 'expense', undefined, [r])).toBeNull();
  });

  it('rule without a type filter matches either type', () => {
    const r = rule({ pattern: 'bank', category: 'bills' });
    expect(matchRule('bank', 'expense', undefined, [r])).toBe(r);
    expect(matchRule('bank', 'income', undefined, [r])).toBe(r);
  });

  it('applies accountId filter when rule specifies one', () => {
    const r = rule({ pattern: 'uber', category: 'transport', accountId: 'acc-1' });
    expect(matchRule('uber ride', 'expense', 'acc-1', [r])).toBe(r);
    expect(matchRule('uber ride', 'expense', 'acc-2', [r])).toBeNull();
    expect(matchRule('uber ride', 'expense', undefined, [r])).toBeNull();
  });

  it('ignores rules with empty pattern', () => {
    const r = rule({ pattern: '' });
    expect(matchRule('coffee', 'expense', undefined, [r])).toBeNull();
  });

  it('returns null for an empty description', () => {
    const r = rule({ pattern: 'coffee' });
    expect(matchRule('', 'expense', undefined, [r])).toBeNull();
  });
});

describe('applyRulesToParsed', () => {
  it('overrides the category when a rule matches', () => {
    const r = rule({ pattern: 'grab', category: 'transport' });
    const parsed = { description: 'grab dinner', amount: 200, type: 'expense' as const, category: 'food' };
    expect(applyRulesToParsed(parsed, [r])).toEqual({ ...parsed, category: 'transport' });
  });

  it('overrides the type when a rule specifies one', () => {
    const r = rule({ pattern: 'bonus', category: 'gift', type: 'income' });
    const parsed = { description: 'year-end bonus', amount: 5000, type: 'expense' as const, category: 'other' };
    expect(applyRulesToParsed(parsed, [r]).type).toBe('income');
  });

  it('returns the parsed input unchanged when no rule matches', () => {
    const r = rule({ pattern: 'coffee' });
    const parsed = { description: 'movie night', amount: 300, type: 'expense' as const, category: 'entertainment' };
    expect(applyRulesToParsed(parsed, [r])).toEqual(parsed);
  });
});
