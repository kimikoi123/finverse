const TICKER_TO_COINGECKO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  BNB: 'binancecoin',
  USDT: 'tether',
  USDC: 'usd-coin',
};

export function getCryptoId(ticker: string): string | null {
  return TICKER_TO_COINGECKO[ticker.toUpperCase()] ?? null;
}

export async function fetchCryptoPrice(ticker: string): Promise<number | null> {
  const id = getCryptoId(ticker);
  if (!id) return null;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[id]?.usd ?? null;
  } catch {
    return null;
  }
}
