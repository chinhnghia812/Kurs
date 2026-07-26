/**
 * SEP-7 URI builder for USDC payments.
 * Spec: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
 */

export interface Sep7PayParams {
  destination: string;
  amountUsdc: string; // display amount like "1.5"
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
  memoType?: 'text' | 'id' | 'hash' | 'return';
  callbackUrl?: string;
}

const USDC_ISSUER_TESTNET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

/**
 * Build a web+stellar:pay URI for USDC payment.
 */
export function buildSep7PayUri(params: Sep7PayParams): string {
  const {
    destination,
    amountUsdc,
    assetCode = 'USDC',
    assetIssuer = USDC_ISSUER_TESTNET,
    memo,
    memoType = 'text',
  } = params;

  const qs = new URLSearchParams();
  qs.set('destination', destination);
  qs.set('amount', amountUsdc);
  qs.set('asset_code', assetCode);
  qs.set('asset_issuer', assetIssuer);
  if (memo) {
    qs.set('memo', memo);
    qs.set('memo_type', memoType);
  }

  return `web+stellar:pay?${qs.toString()}`;
}

/**
 * Parse a SEP-7 pay URI and return its parameters.
 */
export function parseSep7PayUri(uri: string): Record<string, string> | null {
  if (!uri.startsWith('web+stellar:pay?')) return null;
  const qsPart = uri.replace('web+stellar:pay?', '');
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(qsPart)) {
    params[k] = v;
  }
  return params;
}
