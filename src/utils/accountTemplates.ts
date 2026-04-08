import type { AccountType } from '../types';
import { BANKS, EWALLETS } from './institutions';

export type TemplateGroup = 'popular' | 'savings' | 'credit_card' | 'ewallet' | 'investment';

export interface AccountTemplate {
  key: string;
  name: string;
  type: AccountType;
  group: TemplateGroup;
  institutionKey?: string;
  currency: string;
  color: string;
}

export const TEMPLATE_GROUPS: { key: TemplateGroup; label: string }[] = [
  { key: 'popular', label: 'Popular' },
  { key: 'savings', label: 'Savings' },
  { key: 'credit_card', label: 'Credit Cards' },
  { key: 'ewallet', label: 'E-Wallets' },
  { key: 'investment', label: 'Investments' },
];

const CREDIT_CARD_BANK_KEYS = [
  'bpi', 'bdo', 'metrobank', 'rcbc', 'securitybank', 'unionbank', 'eastwest', 'hsbc',
];

const savingsTemplates: AccountTemplate[] = BANKS.map((b) => ({
  key: `${b.key}-savings`,
  name: `${b.name} Savings`,
  type: 'debit' as const,
  group: 'savings' as const,
  institutionKey: b.key,
  currency: 'PHP',
  color: b.color,
}));

const creditTemplates: AccountTemplate[] = BANKS
  .filter((b) => CREDIT_CARD_BANK_KEYS.includes(b.key))
  .map((b) => ({
    key: `${b.key}-credit`,
    name: `${b.name} Credit Card`,
    type: 'credit' as const,
    group: 'credit_card' as const,
    institutionKey: b.key,
    currency: 'PHP',
    color: b.color,
  }));

const ewalletTemplates: AccountTemplate[] = EWALLETS.map((e) => ({
  key: e.key,
  name: e.name,
  type: 'ewallet' as const,
  group: 'ewallet' as const,
  institutionKey: e.key,
  currency: 'PHP',
  color: e.color,
}));

const investmentTemplates: AccountTemplate[] = [
  { key: 'stocks', name: 'Stocks', type: 'stocks', group: 'investment', currency: 'PHP', color: '#ea580c' },
  { key: 'crypto', name: 'Crypto', type: 'crypto', group: 'investment', currency: 'USD', color: '#9333ea' },
];

export const ACCOUNT_TEMPLATES: AccountTemplate[] = [
  ...savingsTemplates,
  ...creditTemplates,
  ...ewalletTemplates,
  ...investmentTemplates,
];

export const POPULAR_TEMPLATE_KEYS = [
  'gcash', 'maya', 'bpi-savings', 'bdo-savings', 'bpi-credit',
];

export function getTemplatesByGroup(group: TemplateGroup): AccountTemplate[] {
  if (group === 'popular') {
    return POPULAR_TEMPLATE_KEYS
      .map((k) => ACCOUNT_TEMPLATES.find((t) => t.key === k))
      .filter((t): t is AccountTemplate => t != null);
  }
  return ACCOUNT_TEMPLATES.filter((t) => t.group === group);
}
