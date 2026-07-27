'use client';

import { getAddress, setAllowed, signTransaction } from '@stellar/freighter-api';
import {
  CheckCircle2,
  Copy,
  RefreshCw,
  ShoppingCart,
  Tag,
  TrendingUp,
  Wallet,
  Wifi,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CurrencyCode, FxRates } from '../lib/fx-client';
import { convertUsdcToDisplay } from '../lib/fx-client';

interface Item {
  id: string;
  name: string;
  basePriceUsdc: string;
  currencyCode: string;
  merchantId: string;
  createdAt: string;
  merchantName: string;
  merchantAddress: string;
}

interface PaymentResult {
  id: string;
  itemId: string;
  amountUsdc: string;
  memo: string;
  status: string;
  sep7Uri: string;
  amountUsdcDisplay: string;
  itemName: string;
  stellarTxHash: string | null;
  createdAt: string;
}

const CURRENCIES: CurrencyCode[] = ['PHP', 'USD', 'VND', 'IDR', 'USDC'];
const CURRENCY_FLAGS: Record<CurrencyCode, string> = {
  PHP: '🇵🇭',
  USD: '🇺🇸',
  VND: '🇻🇳',
  IDR: '🇮🇩',
  USDC: '⭐',
};

const ITEM_EMOJIS: Record<string, string> = {
  Siopao: '🥟',
  Lumpia: '🌮',
  'Halo-halo': '🍧',
};

export function KursWidget() {
  const [rates, setRates] = useState<FxRates | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [flashedPrices, setFlashedPrices] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBusy, setWalletBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [walletError, setWalletError] = useState('');
  const prevRatesRef = useRef<FxRates | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Fetch FX rates every 10s
  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch('/api/fx');
      const json = await res.json();
      if (json.ok) {
        const newRates: FxRates = json.data;
        // Detect changes → flash prices
        if (prevRatesRef.current) {
          const changed = new Set<string>();
          for (const key of ['USDC_PHP', 'USDC_VND', 'USDC_IDR'] as const) {
            if (Math.abs(prevRatesRef.current[key] - newRates[key]) > 0.0001) {
              // find items affected
              for (const item of items) {
                changed.add(item.id);
              }
            }
          }
          if (changed.size > 0) {
            setFlashedPrices(changed);
            setTimeout(() => setFlashedPrices(new Set()), 900);
          }
        }
        prevRatesRef.current = newRates;
        setRates(newRates);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch {
      // ignore
    }
  }, [items]);

  // Load items
  useEffect(() => {
    fetch('/api/items')
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setItems(json.data);
      })
      .catch(() => {});
  }, []);

  // FX rate polling
  useEffect(() => {
    fetchRates();
    const id = setInterval(fetchRates, 10_000);
    return () => clearInterval(id);
  }, [fetchRates]);

  // SSE for payment updates
  useEffect(() => {
    if (!payment) return;
    const es = new EventSource('/api/sse');
    sseRef.current = es;

    es.addEventListener('payment_update', (e) => {
      try {
        const allPayments: PaymentResult[] = JSON.parse(e.data);
        const match = allPayments.find((p) => p.id === payment.id);
        if (match?.status === 'paid') {
          setPaymentStatus('paid');
          es.close();
        }
      } catch {
        // ignore
      }
    });

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [payment]);

  // Generate QR code
  useEffect(() => {
    if (!payment?.sep7Uri) return;
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(payment.sep7Uri, {
        width: 280,
        margin: 2,
        color: { dark: '#1c1917', light: '#fffbeb' },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    });
  }, [payment?.sep7Uri]);

  const handleSelectItem = async (item: Item) => {
    setSelectedItem(item);
    setPayment(null);
    setQrDataUrl(null);
    setPaymentStatus(null);
    setCopied(false);
    setLoading(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          merchantAddress: item.merchantAddress,
        }),
      });
      const json = await res.json();
      if (json.ok) setPayment(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!payment?.sep7Uri) return;
    navigator.clipboard.writeText(payment.sep7Uri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSimulatePay = async () => {
    if (!payment) return;
    setSimulating(true);
    try {
      const res = await fetch(`/api/payments/${payment.id}/simulate`, { method: 'POST' });
      const json = await res.json();
      if (json.ok) setPaymentStatus('paid');
    } catch {
      // ignore
    } finally {
      setSimulating(false);
    }
  };

  const handleConnect = async () => {
    setWalletBusy(true);
    setWalletError('');
    try {
      const permission = await setAllowed();
      if (permission.error || !permission.isAllowed) {
        throw new Error(permission.error?.message ?? 'Freighter access was not allowed');
      }
      const result = await getAddress();
      if (result.error || !result.address) {
        throw new Error(result.error?.message ?? 'No wallet address returned');
      }
      setWalletAddress(result.address);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Could not connect Freighter');
    } finally {
      setWalletBusy(false);
    }
  };

  const handlePayWithFreighter = async () => {
    if (!payment || !walletAddress) return;
    setPaying(true);
    setWalletError('');
    try {
      const preparedResponse = await fetch('/api/payments/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.id, senderAddress: walletAddress }),
      });
      const prepared = await preparedResponse.json();
      if (!prepared.ok) throw new Error(prepared.error?.message ?? 'Could not prepare payment');

      const signed = await signTransaction(prepared.data.unsignedXdr, {
        address: walletAddress,
        networkPassphrase: prepared.data.networkPassphrase,
      });
      if (signed.error || !signed.signedTxXdr) {
        throw new Error(signed.error?.message ?? 'Freighter did not return a signature');
      }

      const confirmedResponse = await fetch(`/api/payments/${payment.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr: signed.signedTxXdr }),
      });
      const confirmed = await confirmedResponse.json();
      if (!confirmed.ok) throw new Error(confirmed.error?.message ?? 'Could not confirm payment');
      setPayment((current) =>
        current ? { ...current, status: 'paid', stellarTxHash: confirmed.data.txHash } : current,
      );
      setPaymentStatus('paid');
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-white border-b border-amber-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-[var(--font-space-grotesk)]">
                Kurs
              </h1>
              <p className="text-xs text-amber-600 font-medium">
                Show prices in any currency, get paid in USDC.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-green-600 font-medium">Live</span>
            {lastUpdated && <span className="text-gray-400">· updated {lastUpdated}</span>}
            <button
              type="button"
              onClick={handleConnect}
              disabled={walletBusy}
              className="ml-2 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              <Wallet className="h-3.5 w-3.5" />
              {walletBusy
                ? 'Connecting…'
                : walletAddress
                  ? `${walletAddress.slice(0, 5)}…${walletAddress.slice(-4)}`
                  : 'Connect Freighter'}
            </button>
          </div>
        </div>
      </header>

      {/* Merchant banner */}
      <div className="bg-amber-600 text-white px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
          <span className="font-semibold">Rosa's Sari-Sari Store</span>
          <span className="opacity-70">·</span>
          <span className="opacity-80">Quezon City, Philippines</span>
          <span className="opacity-70">·</span>
          <span className="opacity-80 font-[var(--font-space-grotesk)] text-xs">
            G...ROSA (testnet)
          </span>
        </div>
      </div>

      {/* F-layout: left panel + right panel */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* LEFT PANEL — Price Tag Widget */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-gray-800 font-[var(--font-space-grotesk)]">
                Today's Menu
              </h2>
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                Prices update every 10s
              </span>
            </div>

            {/* Rate bar */}
            {rates && (
              <div className="mb-4 bg-white rounded-xl border border-amber-100 p-3 flex flex-wrap gap-4 text-xs text-gray-600">
                <span className="font-semibold text-gray-800">Live Rates:</span>
                <span>🇵🇭 ₱{rates.USDC_PHP.toFixed(2)}/USDC</span>
                <span>🇻🇳 ₫{Math.round(rates.USDC_VND).toLocaleString()}/USDC</span>
                <span>🇮🇩 Rp{Math.round(rates.USDC_IDR).toLocaleString()}/USDC</span>
                <span>🇺🇸 $1.00/USDC</span>
              </div>
            )}

            {/* Items list */}
            <div className="space-y-4">
              {items.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Loading menu items…</p>
                </div>
              )}
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left bg-white rounded-2xl border-2 p-5 transition-all hover:shadow-md active:scale-[0.99] cursor-pointer ${
                    selectedItem?.id === item.id
                      ? 'border-amber-500 shadow-md shadow-amber-100'
                      : 'border-amber-100 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{ITEM_EMOJIS[item.name] ?? '🍽️'}</span>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                        <p className="text-xs text-gray-400">Click to pay with USDC</p>
                      </div>
                    </div>
                    {selectedItem?.id === item.id && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Multi-currency price grid */}
                  <div
                    className={`grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl p-3 transition-colors ${
                      flashedPrices.has(item.id) ? 'price-flash' : 'bg-amber-50'
                    }`}
                  >
                    {CURRENCIES.map((cur) => {
                      const displayPrice = rates
                        ? convertUsdcToDisplay(item.basePriceUsdc, cur, rates)
                        : '—';
                      return (
                        <div key={cur} className="text-center">
                          <div className="text-lg">{CURRENCY_FLAGS[cur]}</div>
                          <div
                            className={`font-bold text-sm font-[var(--font-space-grotesk)] ${
                              cur === 'USDC' ? 'text-amber-600' : 'text-gray-800'
                            }`}
                          >
                            {displayPrice}
                          </div>
                          <div className="text-xs text-gray-400">{cur}</div>
                        </div>
                      );
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL — QR code + Payment */}
          <div className="w-full lg:w-96 shrink-0">
            <div className="sticky top-6">
              {!selectedItem ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-amber-200 p-10 text-center">
                  <Tag className="w-12 h-12 mx-auto mb-3 text-amber-300" />
                  <p className="text-gray-400 font-medium">Select an item to pay</p>
                  <p className="text-xs text-gray-300 mt-1">A SEP-7 QR code will appear here</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-lg">
                  {/* Panel header */}
                  <div className="bg-amber-600 px-5 py-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{ITEM_EMOJIS[selectedItem.name] ?? '🍽️'}</span>
                      <h3 className="font-bold text-lg">{selectedItem.name}</h3>
                    </div>
                    {rates && (
                      <div className="text-amber-100 text-sm">
                        {convertUsdcToDisplay(selectedItem.basePriceUsdc, 'PHP', rates)}
                        <span className="mx-2 opacity-50">·</span>
                        {convertUsdcToDisplay(selectedItem.basePriceUsdc, 'USDC', rates)}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    {/* Payment status: PAID */}
                    {paymentStatus === 'paid' ? (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                        <h4 className="text-xl font-bold text-gray-900 mb-1">Payment Received!</h4>
                        <p className="text-sm text-gray-500 mb-2">
                          {payment?.amountUsdcDisplay} USDC confirmed
                        </p>
                        {payment?.stellarTxHash && (
                          <p className="text-xs text-gray-400 font-mono break-all">
                            tx: {payment.stellarTxHash.substring(0, 24)}…
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(null);
                            setPayment(null);
                            setPaymentStatus(null);
                            setQrDataUrl(null);
                          }}
                          className="mt-5 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                        >
                          New Order
                        </button>
                      </div>
                    ) : loading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="w-8 h-8 text-amber-400 mx-auto animate-spin mb-2" />
                        <p className="text-sm text-gray-400">Generating payment…</p>
                      </div>
                    ) : payment ? (
                      <div className="space-y-4">
                        {/* QR Code */}
                        <div className="flex justify-center">
                          {qrDataUrl ? (
                            <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                              {/* biome-ignore lint/performance/noImgElement: QR code is a runtime-generated data URL. */}
                              <img
                                src={qrDataUrl}
                                alt="SEP-7 Payment QR"
                                width={260}
                                height={260}
                                className="rounded-lg"
                              />
                            </div>
                          ) : (
                            <div className="w-64 h-64 bg-amber-50 rounded-xl flex items-center justify-center">
                              <RefreshCw className="w-8 h-8 text-amber-300 animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* Memo */}
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-400 mb-1">Order Reference</p>
                          <p className="font-mono text-sm font-bold text-gray-700">
                            {payment.memo}
                          </p>
                        </div>

                        {/* Amount breakdown */}
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-gray-600">
                            <span>Amount</span>
                            <span className="font-bold text-amber-700">
                              {payment.amountUsdcDisplay} USDC
                            </span>
                          </div>
                          {rates && (
                            <div className="flex justify-between text-gray-400 text-xs">
                              <span>In PHP</span>
                              <span>
                                ≈ {convertUsdcToDisplay(selectedItem.basePriceUsdc, 'PHP', rates)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors"
                          >
                            {copied ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy SEP-7 URI
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={walletAddress ? handlePayWithFreighter : handleConnect}
                            disabled={paying || walletBusy}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-700 text-white rounded-xl font-semibold hover:bg-amber-800 transition-colors disabled:opacity-50"
                          >
                            {paying || walletBusy ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Wallet className="w-4 h-4" />
                            )}
                            {walletAddress ? 'Pay with Freighter' : 'Connect Freighter to pay'}
                          </button>

                          <button
                            type="button"
                            onClick={handleSimulatePay}
                            disabled={simulating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            {simulating ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            Simulate Payment (demo)
                          </button>
                        </div>

                        {walletError && (
                          <p className="text-xs leading-5 text-red-600" role="alert">
                            {walletError}
                          </p>
                        )}

                        <p className="text-xs text-center text-gray-400">
                          Freighter signs the payment; the server verifies the intent before
                          submission.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Stellar badge */}
              <div className="mt-4 bg-white rounded-xl border border-amber-100 p-3 text-center text-xs text-gray-400">
                <span className="font-semibold text-gray-600">Powered by</span>{' '}
                <span className="text-amber-600 font-bold">Stellar</span> · <span>SEP-7</span> ·{' '}
                <span>USDC</span> · <span>Reflector Oracle</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
