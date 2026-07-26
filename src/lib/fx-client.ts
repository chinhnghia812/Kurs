/**
 * Client-safe FX utilities — pure functions, no Node.js deps.
 * Safe to import in 'use client' components.
 */

export interface FxRates {
  USDC_PHP: number;
  USDC_USD: number;
  USDC_VND: number;
  USDC_IDR: number;
  updatedAt: string;
}

export type CurrencyCode = 'PHP' | 'USD' | 'VND' | 'IDR' | 'USDC';

export const CURRENCY_META: Record<
  CurrencyCode,
  { symbol: string; name: string; decimals: number }
> = {
  PHP: { symbol: '₱', name: 'Philippine Peso', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  VND: { symbol: '₫', name: 'Vietnamese Dong', decimals: 0 },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 0 },
  USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 2 },
};

/**
 * Convert USDC amount (as 6-decimal bigint string) to display value in target currency.
 */
export function convertUsdcToDisplay(
  amountMinor: string,
  currency: CurrencyCode,
  rates: FxRates,
): string {
  const minor = BigInt(amountMinor);
  const usdc = Number(minor) / 1_000_000;
  const meta = CURRENCY_META[currency];

  let converted: number;
  if (currency === 'USDC') {
    converted = usdc;
  } else if (currency === 'PHP') {
    converted = usdc * rates.USDC_PHP;
  } else if (currency === 'USD') {
    converted = usdc * rates.USDC_USD;
  } else if (currency === 'VND') {
    converted = usdc * rates.USDC_VND;
  } else {
    // IDR
    converted = usdc * rates.USDC_IDR;
  }

  const formatted =
    meta.decimals === 0
      ? Math.round(converted).toLocaleString('en-US')
      : converted.toFixed(meta.decimals);

  if (currency === 'USDC') return `${formatted} USDC`;
  if (currency === 'IDR') return `Rp ${formatted}`;
  return `${meta.symbol}${formatted}`;
}
