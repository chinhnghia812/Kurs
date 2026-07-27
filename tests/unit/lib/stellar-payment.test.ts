import { describe, expect, it } from 'vitest';
import { amountFromMinor } from '../../../src/server/lib/stellar-payment';

describe('amountFromMinor', () => {
  it('converts six-decimal app storage to Stellar seven-decimal amounts', () => {
    expect(amountFromMinor('1500000')).toBe('1.5000000');
    expect(amountFromMinor('2000000')).toBe('2.0000000');
  });

  it('keeps sub-cent precision at the Stellar boundary', () => {
    expect(amountFromMinor('1')).toBe('0.0000010');
  });

  it('rejects zero and non-integer storage values', () => {
    expect(() => amountFromMinor('0')).toThrow();
    expect(() => amountFromMinor('1.5')).toThrow();
  });
});
