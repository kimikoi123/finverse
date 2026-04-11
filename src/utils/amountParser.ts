const K_REGEX = /^(\d+(?:\.\d+)?)\s*k$/i;

export function parseAmountInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  const kMatch = trimmed.match(K_REGEX);
  if (kMatch) return parseFloat(kMatch[1]!) * 1000;

  const val = parseFloat(trimmed);
  return val > 0 ? val : 0;
}

export function isKNotation(raw: string): boolean {
  return K_REGEX.test(raw.trim());
}

export type AmountValidation =
  | { ok: true; value: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'negative' | 'zero' };

export function validateAmountInput(raw: string): AmountValidation {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'empty' };

  const kMatch = trimmed.match(K_REGEX);
  if (kMatch) {
    const value = parseFloat(kMatch[1]!) * 1000;
    return value > 0 ? { ok: true, value } : { ok: false, reason: 'zero' };
  }

  const val = parseFloat(trimmed);
  if (isNaN(val)) return { ok: false, reason: 'invalid' };
  if (val < 0) return { ok: false, reason: 'negative' };
  if (val === 0) return { ok: false, reason: 'zero' };
  return { ok: true, value: val };
}

export function amountErrorMessage(reason: Exclude<AmountValidation, { ok: true }>['reason']): string {
  switch (reason) {
    case 'empty':
      return 'Please enter an amount.';
    case 'invalid':
      return 'Please enter a valid number.';
    case 'negative':
      return 'Amount cannot be negative.';
    case 'zero':
      return 'Amount must be greater than 0.';
  }
}
