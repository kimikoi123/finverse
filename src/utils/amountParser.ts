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
