/**
 * FX conversion utilities — server-side.
 * Re-exports client-safe types + adds server-only simulation helpers.
 */

export type {
  CurrencyCode,
  FxRates,
} from '../../lib/fx-client';

export {
  CURRENCY_META,
  convertUsdcToDisplay,
} from '../../lib/fx-client';

/** Base rates without noise — used as the seed for simulation */
export const BASE_RATES = {
  USDC_PHP: 58.3,
  USDC_USD: 1.0,
  USDC_VND: 25100,
  USDC_IDR: 16200,
} as const;

/**
 * Apply ±noise% random fluctuation to simulate live FX feed.
 */
export function applyNoise(rate: number, noisePct = 0.02): number {
  const delta = rate * noisePct * (Math.random() * 2 - 1);
  return rate + delta;
}

/**
 * Generate simulated live FX rates with ±2% noise.
 */
export function generateLiveRates() {
  return {
    USDC_PHP: applyNoise(BASE_RATES.USDC_PHP),
    USDC_USD: BASE_RATES.USDC_USD, // USD/USDC is always 1
    USDC_VND: applyNoise(BASE_RATES.USDC_VND),
    USDC_IDR: applyNoise(BASE_RATES.USDC_IDR),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Convert USDC display amount (e.g. "1.5") to minor string (e.g. "1500000").
 */
export function usdcToMinor(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(n * 1_000_000).toString();
}

/**
 * Convert USDC minor string to display string.
 */
export function minorToUsdc(minor: string): string {
  const n = BigInt(minor);
  const whole = n / 1_000_000n;
  const frac = n % 1_000_000n;
  const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '') || '00';
  return `${whole}.${fracStr}`;
}
