import type { Rule } from '../types';
import { applyRulesToParsed } from './rules';

export interface ParsedTransaction {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

type CategoryMapping = { category: string; type: 'income' | 'expense' };

const KEYWORD_MAP: Record<string, CategoryMapping> = {};

function register(keywords: string[], category: string, type: 'income' | 'expense') {
  for (const kw of keywords) {
    KEYWORD_MAP[kw] = { category, type };
  }
}

// Expense categories
register(
  ['starbucks', 'coffee', 'lunch', 'dinner', 'breakfast', 'restaurant', 'groceries', 'jollibee', 'mcdonald', 'mcdonalds', 'pizza', 'burger', 'snack', 'cafe', 'food', 'eat', 'foodpanda', 'grabfood'],
  'food', 'expense',
);
register(
  ['uber', 'grab', 'taxi', 'gas', 'fuel', 'parking', 'bus', 'train', 'mrt', 'jeep', 'toll', 'lyft', 'angkas', 'fare'],
  'transport', 'expense',
);
register(
  ['amazon', 'shopee', 'lazada', 'mall', 'clothes', 'shoes', 'uniqlo', 'zara', 'shopping'],
  'shopping', 'expense',
);
register(
  ['rent', 'electric', 'electricity', 'water', 'internet', 'wifi', 'phone', 'netflix', 'spotify', 'insurance', 'subscription', 'bill', 'bills', 'meralco', 'pldt', 'globe'],
  'bills', 'expense',
);
register(
  ['movie', 'cinema', 'concert', 'game', 'bar', 'club', 'karaoke', 'entertainment'],
  'entertainment', 'expense',
);
register(
  ['medicine', 'pharmacy', 'doctor', 'hospital', 'gym', 'dental', 'clinic', 'health', 'vitamins'],
  'health', 'expense',
);
register(
  ['tuition', 'school', 'book', 'books', 'course', 'udemy', 'class', 'education'],
  'education', 'expense',
);

// Income categories
register(
  ['salary', 'paycheck', 'wage', 'sahod', 'sweldo'],
  'salary', 'income',
);
register(
  ['freelance', 'gig', 'client', 'invoice', 'project', 'sideline'],
  'freelance', 'income',
);
register(
  ['gift', 'bonus', 'birthday', 'present', 'aguinaldo'],
  'gift', 'income',
);
register(
  ['refund', 'cashback', 'rebate', 'return'],
  'refund', 'income',
);

// Amount regex: matches numbers like 30k, 1.5k
const AMOUNT_K_REGEX = /(\d+(?:\.\d+)?)\s*k\b/i;

function extractAmount(input: string): { amount: number; remaining: string } | null {
  // Try "k" suffix first (e.g., "30k", "1.5k")
  const kMatch = input.match(AMOUNT_K_REGEX);
  if (kMatch) {
    const amount = parseFloat(kMatch[1]!) * 1000;
    const remaining = input.replace(kMatch[0], '').trim();
    return { amount, remaining };
  }

  // Find all plain numbers
  const numbers = [...input.matchAll(/(\d+(?:\.\d+)?)/g)];
  if (numbers.length === 0) return null;

  // Use the last number as the amount (natural pattern: "Lunch with friends 350")
  // Unless first token is a number and rest is text (pattern: "250 Starbucks")
  const firstToken = input.trim().split(/\s+/)[0];
  const firstIsNumber = firstToken !== undefined && /^\d+(?:\.\d+)?$/.test(firstToken);

  let match: RegExpMatchArray;
  if (numbers.length === 1) {
    match = numbers[0]!;
  } else if (firstIsNumber) {
    match = numbers[0]!;
  } else {
    match = numbers[numbers.length - 1]!;
  }

  const amount = parseFloat(match[1]!);
  if (amount <= 0) return null;

  const remaining = input.slice(0, match.index!) + input.slice(match.index! + match[0].length);
  return { amount, remaining: remaining.replace(/\s+/g, ' ').trim() };
}

function detectCategory(description: string): CategoryMapping {
  const words = description.toLowerCase().split(/\s+/);
  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (cleaned && KEYWORD_MAP[cleaned]) {
      return KEYWORD_MAP[cleaned];
    }
  }
  return { category: 'other', type: 'expense' };
}

export function parseTransactionInput(input: string, rules?: readonly Rule[]): ParsedTransaction | null {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;

  const extracted = extractAmount(trimmed);
  if (!extracted) return null;

  const { amount, remaining } = extracted;
  const description = remaining;
  const { category, type } = description ? detectCategory(description) : { category: 'other', type: 'expense' as const };

  const parsed: ParsedTransaction = { description, amount, type, category };
  // User rules override the hardcoded KEYWORD_MAP fallback.
  return rules && rules.length > 0 ? applyRulesToParsed(parsed, rules) : parsed;
}
