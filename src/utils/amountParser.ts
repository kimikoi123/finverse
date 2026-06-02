const K_REGEX = /^(\d+(?:\.\d+)?)\s*k$/i;

// Strip en-US grouping commas before parsing. The app renders amounts
// comma-grouped everywhere (toLocaleString('en-US') / PHP formatting) and
// decimals always use '.', so commas are unambiguously thousands separators.
// Without this, parseFloat('25,000') === 25 — silently corrupting input.
function stripGrouping(raw: string): string {
  return raw.trim().replace(/,/g, '');
}

export function parseAmountInput(raw: string): number {
  const cleaned = stripGrouping(raw);
  if (!cleaned) return 0;

  const kMatch = cleaned.match(K_REGEX);
  if (kMatch) return parseFloat(kMatch[1]!) * 1000;

  const val = parseFloat(cleaned);
  return val > 0 ? val : 0;
}

export function isKNotation(raw: string): boolean {
  return K_REGEX.test(stripGrouping(raw));
}

export type AmountValidation =
  | { ok: true; value: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'negative' | 'zero' };

export function validateAmountInput(raw: string): AmountValidation {
  const cleaned = stripGrouping(raw);
  if (!cleaned) return { ok: false, reason: 'empty' };

  const kMatch = cleaned.match(K_REGEX);
  if (kMatch) {
    const value = parseFloat(kMatch[1]!) * 1000;
    return value > 0 ? { ok: true, value } : { ok: false, reason: 'zero' };
  }

  const val = parseFloat(cleaned);
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
