import type { Account, AccountGradient } from '../types';
import { ACCOUNT_GRADIENTS, DEFAULT_GRADIENT } from '../hooks/useAccounts';

// Parse a 3- or 6-digit hex string into [r, g, b]. Returns null for garbage.
function parseHex(hex: string): [number, number, number] | null {
  if (!hex) return null;
  let s = hex.trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (s.length !== 6) return null;
  const n = parseInt(s, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const h = (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
  return '#' + h.toString(16).padStart(6, '0');
}

// Lerp a color toward black by `amount` (0–1). 0.22 ≈ 22% darker.
export function darkenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  const k = 1 - amount;
  return toHex(r * k, g * k, b * k);
}

export function gradientToCss(gradient: AccountGradient): string {
  const angle = gradient.angle ?? 135;
  return `linear-gradient(${angle}deg, ${gradient.from}, ${gradient.to})`;
}

// Resolve the CSS `background` value for any account. Precedence:
//   1. explicit `gradient` on the account
//   2. derived gradient from solid `color` (darken to 22%)
//   3. default preset (should never hit — accounts always have a color)
export function buildCardBackground(
  account: Pick<Account, 'color' | 'gradient'>,
): string {
  if (account.gradient) return gradientToCss(account.gradient);
  if (account.color) {
    return `linear-gradient(135deg, ${account.color}, ${darkenHex(account.color, 0.22)})`;
  }
  return gradientToCss(DEFAULT_GRADIENT);
}

// Inset highlight + soft drop — fakes a glossy top edge so flat gradients
// read as physical card stock. Theme-independent.
export const CARD_INSET_SHADOW =
  'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.08)';

// Match a stored gradient back to a known preset by id so the picker can
// pre-select the right tile when editing. Falls back to null.
export function findPresetById(id: string | undefined) {
  if (!id) return null;
  return ACCOUNT_GRADIENTS.find((g) => g.id === id) ?? null;
}
