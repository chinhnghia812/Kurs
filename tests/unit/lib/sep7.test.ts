import { describe, expect, it } from 'vitest';
import { buildSep7PayUri, parseSep7PayUri } from '../../../src/server/lib/sep7';

const TEST_DESTINATION = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZFH3UWUYNV4TESTADDRESS';

describe('buildSep7PayUri', () => {
  it('builds a valid web+stellar:pay URI', () => {
    const uri = buildSep7PayUri({
      destination: TEST_DESTINATION,
      amountUsdc: '1.5',
    });
    expect(uri).toMatch(/^web\+stellar:pay\?/);
    expect(uri).toContain(`destination=${TEST_DESTINATION}`);
    expect(uri).toContain('amount=1.5');
    expect(uri).toContain('asset_code=USDC');
  });

  it('includes memo when provided', () => {
    const uri = buildSep7PayUri({
      destination: TEST_DESTINATION,
      amountUsdc: '2.0',
      memo: 'ORDER-ABC123',
    });
    expect(uri).toContain('memo=ORDER-ABC123');
    expect(uri).toContain('memo_type=text');
  });

  it('uses custom asset issuer when provided', () => {
    const customIssuer = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
    const uri = buildSep7PayUri({
      destination: TEST_DESTINATION,
      amountUsdc: '1.0',
      assetIssuer: customIssuer,
    });
    expect(uri).toContain(customIssuer);
  });
});

describe('parseSep7PayUri', () => {
  it('parses a valid SEP-7 URI', () => {
    const uri = `web+stellar:pay?destination=${TEST_DESTINATION}&amount=1.5&asset_code=USDC`;
    const params = parseSep7PayUri(uri);
    expect(params).not.toBeNull();
    expect(params?.destination).toBe(TEST_DESTINATION);
    expect(params?.amount).toBe('1.5');
    expect(params?.asset_code).toBe('USDC');
  });

  it('returns null for invalid URI', () => {
    expect(parseSep7PayUri('https://example.com')).toBeNull();
    expect(parseSep7PayUri('')).toBeNull();
  });

  it('parses memo and memo_type', () => {
    const uri = `web+stellar:pay?destination=${TEST_DESTINATION}&amount=1.5&asset_code=USDC&memo=ORDER-XYZ&memo_type=text`;
    const params = parseSep7PayUri(uri);
    expect(params?.memo).toBe('ORDER-XYZ');
    expect(params?.memo_type).toBe('text');
  });
});
