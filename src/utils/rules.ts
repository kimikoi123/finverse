import type { Rule } from '../types';

// Finds the first enabled rule whose pattern appears as a case-insensitive
// substring of `description` and whose optional filters (type, accountId)
// match. Rules are ordered by ascending `priority`; ties break on
// `createdAt` ascending so the oldest rule wins predictably.
export function matchRule(
  description: string,
  type: 'income' | 'expense' | undefined,
  accountId: string | undefined,
  rules: readonly Rule[],
): Rule | null {
  const desc = description.toLowerCase();
  if (desc.length === 0) return null;

  const sorted = [...rules]
    .filter((r) => r.enabled && !r.deletedAt && r.pattern.length > 0)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.createdAt.localeCompare(b.createdAt);
    });

  for (const rule of sorted) {
    if (!desc.includes(rule.pattern.toLowerCase())) continue;
    if (rule.type && type && rule.type !== type) continue;
    if (rule.accountId && accountId && rule.accountId !== accountId) continue;
    if (rule.accountId && !accountId) continue;
    return rule;
  }
  return null;
}

// Apply rules to a parsed QuickAdd result: if a rule matches, override the
// category (and type, when the rule specifies one). Unlike matchRule used
// in TransactionForm, the parser hasn't committed to a type yet — the
// KEYWORD_MAP guess is just a heuristic — so a rule specifying `type` is
// allowed to flip it (refund → shopping/expense vs. refund → refund/income).
export function applyRulesToParsed<T extends { description: string; type: 'income' | 'expense'; category: string }>(
  parsed: T,
  rules: readonly Rule[],
): T {
  const match = matchRule(parsed.description, undefined, undefined, rules);
  if (!match) return parsed;
  return {
    ...parsed,
    category: match.category,
    type: match.type ?? parsed.type,
  };
}
