import { describe, expect, it } from 'vitest';
import {
  applyNoise,
  BASE_RATES,
  convertUsdcToDisplay,
  generateLiveRates,
  minorToUsdc,
  usdcToMinor,
} from '../../../src/server/lib/fx';

describe('usdcToMinor', () => {
  it('converts 1.5 to 1500000', () => {
    expect(usdcToMinor('1.5')).toBe('1500000');
  });

  it('converts 2.0 to 2000000', () => {
    expect(usdcToMinor(2.0)).toBe('2000000');
  });

  it('converts 3.0 to 3000000', () => {
    expect(usdcToMinor('3.0')).toBe('3000000');
  });
});

describe('minorToUsdc', () => {
  it('converts 1500000 to 1.5', () => {
    expect(minorToUsdc('1500000')).toBe('1.5');
  });

  it('converts 2000000 to 2.xx form', () => {
    // minorToUsdc always returns at least 2 decimal places for whole amounts
    const result = minorToUsdc('2000000');
    expect(result).toMatch(/^2/);
    expect(parseFloat(result)).toBe(2);
  });

  it('converts 1000000 to 1.xx form', () => {
    const result = minorToUsdc('1000000');
    expect(result).toMatch(/^1/);
    expect(parseFloat(result)).toBe(1);
  });
});

describe('applyNoise', () => {
  it('returns rate within ±2% for default noise', () => {
    const base = 58.3;
    const result = applyNoise(base, 0.02);
    expect(result).toBeGreaterThan(base * 0.98);
    expect(result).toBeLessThan(base * 1.02);
  });

  it('returns 1.0 with zero noise', () => {
    expect(applyNoise(1.0, 0)).toBe(1.0);
  });
});

describe('generateLiveRates', () => {
  it('returns object with required keys', () => {
    const rates = generateLiveRates();
    expect(rates).toHaveProperty('USDC_PHP');
    expect(rates).toHaveProperty('USDC_USD');
    expect(rates).toHaveProperty('USDC_VND');
    expect(rates).toHaveProperty('USDC_IDR');
    expect(rates).toHaveProperty('updatedAt');
  });

  it('USDC_USD is always 1.0', () => {
    const rates = generateLiveRates();
    expect(rates.USDC_USD).toBe(1.0);
  });

  it('PHP rate is near base', () => {
    const rates = generateLiveRates();
    expect(rates.USDC_PHP).toBeGreaterThan(BASE_RATES.USDC_PHP * 0.95);
    expect(rates.USDC_PHP).toBeLessThan(BASE_RATES.USDC_PHP * 1.05);
  });
});

describe('convertUsdcToDisplay', () => {
  const rates = {
    USDC_PHP: 58.3,
    USDC_USD: 1.0,
    USDC_VND: 25100,
    USDC_IDR: 16200,
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('converts 1.5 USDC to PHP', () => {
    const result = convertUsdcToDisplay('1500000', 'PHP', rates);
    expect(result).toBe('₱87.45');
  });

  it('converts 2.0 USDC to USD', () => {
    const result = convertUsdcToDisplay('2000000', 'USD', rates);
    expect(result).toBe('$2.00');
  });

  it('converts 3.0 USDC to USDC display', () => {
    const result = convertUsdcToDisplay('3000000', 'USDC', rates);
    expect(result).toContain('USDC');
    expect(result).toContain('3');
  });

  it('converts 2.0 USDC to VND (no decimal)', () => {
    const result = convertUsdcToDisplay('2000000', 'VND', rates);
    expect(result).toContain('₫');
    expect(result).not.toContain('.');
  });

  it('converts 1.5 USDC to IDR (no decimal)', () => {
    const result = convertUsdcToDisplay('1500000', 'IDR', rates);
    expect(result).toContain('Rp');
    expect(result).not.toContain('.');
  });
});
