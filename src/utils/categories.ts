import { Utensils, Car, Home, Ticket, ShoppingBag, ReceiptText, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CategoryDef {
  value: string;
  label: string;
}

const DEFAULT_ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  activities: Ticket,
  shopping: ShoppingBag,
  general: ReceiptText,
};

const DEFAULT_COLORS: Record<string, string> = {
  food: 'text-orange-400 bg-orange-400/15',
  transport: 'text-blue-400 bg-blue-400/15',
  accommodation: 'text-purple-400 bg-purple-400/15',
  activities: 'text-green-400 bg-green-400/15',
  shopping: 'text-pink-400 bg-pink-400/15',
  general: 'text-gray-400 bg-gray-400/15',
};

const DEFAULT_BAR_COLORS: Record<string, string> = {
  food: 'bg-orange-400',
  transport: 'bg-blue-400',
  accommodation: 'bg-purple-400',
  activities: 'bg-green-400',
  shopping: 'bg-pink-400',
  general: 'bg-gray-400',
};

const DEFAULT_CATEGORIES: CategoryDef[] = [
  { value: 'food', label: 'Food & Drinks' },
  { value: 'transport', label: 'Transport' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'activities', label: 'Activities' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'general', label: 'General' },
];

const CUSTOM_COLOR = 'text-teal-400 bg-teal-400/15';
const CUSTOM_BAR_COLOR = 'bg-teal-400';

export function getAllCategories(customCategories?: string[]): CategoryDef[] {
  const custom = (customCategories ?? []).map((name) => ({
    value: name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
  }));
  return [...DEFAULT_CATEGORIES, ...custom];
}

export function getCategoryIcon(key: string): LucideIcon {
  return DEFAULT_ICONS[key] ?? Tag;
}

export function getCategoryColor(key: string): string {
  return DEFAULT_COLORS[key] ?? CUSTOM_COLOR;
}

export function getCategoryBarColor(key: string): string {
  return DEFAULT_BAR_COLORS[key] ?? CUSTOM_BAR_COLOR;
}

export function getCategoryLabel(key: string, customCategories?: string[]): string {
  const def = DEFAULT_CATEGORIES.find((c) => c.value === key);
  if (def) return def.label;
  const custom = (customCategories ?? []).find((c) => c === key);
  if (custom) return custom.charAt(0).toUpperCase() + custom.slice(1);
  return key;
}

export function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

// Personal finance categories
export interface FinanceCategoryDef {
  value: string;
  label: string;
  emoji: string;
}

export const EXPENSE_CATEGORIES: FinanceCategoryDef[] = [
  { value: 'food', label: 'Food', emoji: '🍔' },
  { value: 'transport', label: 'Transport', emoji: '🚌' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'bills', label: 'Bills', emoji: '📄' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎮' },
  { value: 'health', label: 'Health', emoji: '💊' },
  { value: 'education', label: 'Education', emoji: '📚' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export const INCOME_CATEGORIES: FinanceCategoryDef[] = [
  { value: 'salary', label: 'Salary', emoji: '💰' },
  { value: 'freelance', label: 'Freelance', emoji: '💼' },
  { value: 'gift', label: 'Gift', emoji: '🎁' },
  { value: 'refund', label: 'Refund', emoji: '↩️' },
  { value: 'other-income', label: 'Other', emoji: '📦' },
];

export function getFinanceCategoryDef(value: string): FinanceCategoryDef {
  return (
    EXPENSE_CATEGORIES.find((c) => c.value === value) ??
    INCOME_CATEGORIES.find((c) => c.value === value) ??
    { value, label: value, emoji: '📦' }
  );
}
