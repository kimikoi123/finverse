import type { ExchangeRates, ExchangeRateResult } from '../types';
import { CURRENCIES } from './currencies';
import { loadRateCache, saveRateCache } from '../db/storage';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const API_URL = 'https://api.frankfurter.app/latest?from=USD';

function getHardcodedRates(): ExchangeRates {
  const rates: ExchangeRates = {};
  for (const [code, curr] of Object.entries(CURRENCIES)) {
    rates[code] = curr.rate;
  }
  return rates;
}

export async function fetchExchangeRates(): Promise<ExchangeRateResult> {
  // Return fresh cache if available
  const cached = await loadRateCache();
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { rates: cached.rates, timestamp: cached.timestamp, source: 'cache' };
  }

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { base: string; rates: ExchangeRates };

    // Frankfurter returns { base: "USD", rates: { EUR: 0.92, ... } } without USD itself
    const apiRates: ExchangeRates = { USD: 1, ...data.rates };

    // Merge with hardcoded so unsupported currencies (e.g. VND) still have a value
    const hardcoded = getHardcodedRates();
    const merged: ExchangeRates = { ...hardcoded, ...apiRates };

    const timestamp = Date.now();
    await saveRateCache(merged, timestamp);
    return { rates: merged, timestamp, source: 'api' };
  } catch {
    // If we have stale cache, prefer it over hardcoded
    if (cached) {
      return { rates: cached.rates, timestamp: cached.timestamp, source: 'cache' };
    }
    return { rates: getHardcodedRates(), timestamp: null, source: 'fallback' };
  }
}
