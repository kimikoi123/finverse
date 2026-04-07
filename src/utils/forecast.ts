import type { Transaction } from '../types';

export interface ForecastResult {
  expectedIn: number;
  expectedOut: number;
  spendable: number;
}

export function computeForecast(
  transactions: Transaction[],
  accountId: string,
  currentBalance: number
): ForecastResult {
  const recurring = transactions.filter(
    (t) => t.accountId === accountId && t.isRecurring
  );

  let expectedIn = 0;
  let expectedOut = 0;

  for (const t of recurring) {
    if (t.type === 'income') {
      expectedIn += t.amount;
    } else {
      expectedOut += t.amount;
    }
  }

  const spendable = Math.max(0, currentBalance + expectedIn - expectedOut);

  return { expectedIn, expectedOut, spendable };
}
