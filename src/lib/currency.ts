const RATE_CACHE_KEY = 'adj_usd_idr_rate';
const RATE_CACHE_TTL = 60 * 60 * 1000; // 1 jam

interface RateCache {
  rate: number;
  ts: number;
}

const FALLBACK_RATE = 16000;

export async function fetchUsdToIdr(): Promise<number> {
  try {
    const cached = localStorage.getItem(RATE_CACHE_KEY);
    if (cached) {
      const parsed: RateCache = JSON.parse(cached);
      if (Date.now() - parsed.ts < RATE_CACHE_TTL) {
        return parsed.rate;
      }
    }
  } catch {}

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    const rate: number = data?.rates?.IDR ?? FALLBACK_RATE;
    localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }));
    return rate;
  } catch {
    return FALLBACK_RATE;
  }
}

export function getCachedRate(): number {
  try {
    const cached = localStorage.getItem(RATE_CACHE_KEY);
    if (cached) {
      const parsed: RateCache = JSON.parse(cached);
      return parsed.rate;
    }
  } catch {}
  return FALLBACK_RATE;
}

export function usdToIdr(usd: number, rate: number): number {
  return Math.round(usd * rate);
}

export function formatRate(rate: number): string {
  return `1 USD = Rp ${rate.toLocaleString('id-ID')}`;
}
