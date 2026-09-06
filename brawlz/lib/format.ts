import { formatUnits } from 'viem';

/** Stock tokens are 18 decimals (verified on NVDA/AAPL/TSLA/AMZN). */
export const STOCK_DECIMALS = 18;

export function fmt(value?: bigint, decimals = STOCK_DECIMALS, places = 4): string {
  if (value === undefined || value === null) return '—';
  const n = Number(formatUnits(value, decimals));
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: places, maximumFractionDigits: places });
}

export function fmtCompact(value?: bigint, decimals = STOCK_DECIMALS): string {
  if (value === undefined) return '—';
  const n = Number(formatUnits(value, decimals));
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

export function bps(v?: number): string {
  if (v === undefined) return '—';
  return `${(v / 100).toFixed(v % 100 === 0 ? 0 : 1)}%`;
}

/**
 * ERC-8056 Scaled UI Amount. Raw balances never change; dividends and splits move
 * uiMultiplier. We account in raw everywhere and only apply this for display.
 */
export function applyUiMultiplier(raw: bigint, multiplier?: bigint): bigint {
  if (!multiplier || multiplier === 0n) return raw;
  return (raw * multiplier) / 10n ** 18n;
}
