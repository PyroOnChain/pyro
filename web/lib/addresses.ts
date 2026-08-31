import type { Address } from 'viem';

/**
 * Every address below was read off Robinhood Chain mainnet directly.
 * See ADDRESSES.md at the repo root for how each was verified.
 */

export const PONS_FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e' as Address;
export const PONS_ESCROW  = '0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e' as Address;

/** VaultTube's own factory. Set once deployed. */
export const CLUB_FACTORY = (process.env.NEXT_PUBLIC_CLUB_FACTORY || '') as Address | '';

export type StockToken = {
  symbol: string;
  name: string;
  address: Address;
  /** Pons graduation threshold, from pairTokenEconomics(token). Verified on mainnet. */
  graduation: string;
  phantom: string;
};

const MAINNET_STOCKS: StockToken[] = [
  { symbol: 'NVDA', name: 'NVIDIA', address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC', graduation: '41.6',  phantom: '16.64' },
  { symbol: 'AAPL', name: 'Apple',  address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9', graduation: '24.2',  phantom: '9.68'  },
  { symbol: 'TSLA', name: 'Tesla',  address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d', graduation: '26.0',  phantom: '10.40' },
  { symbol: 'AMZN', name: 'Amazon', address: '0x12f190a9F9d7D37a250758b26824B97CE941bF54', graduation: '29.33', phantom: '11.73' },
];

/**
 * Confirmed Pons pair assets: pairTokenEconomics() returns non-zero for each on mainnet.
 * NEXT_PUBLIC_STOCKS overrides the list as JSON, which is how the local anvil stack points
 * at its own deployed token instead of the mainnet addresses.
 */
export const STOCKS: StockToken[] = (() => {
  const raw = process.env.NEXT_PUBLIC_STOCKS;
  if (!raw) return MAINNET_STOCKS;
  try {
    const parsed = JSON.parse(raw) as StockToken[];
    return Array.isArray(parsed) && parsed.length ? parsed : MAINNET_STOCKS;
  } catch {
    return MAINNET_STOCKS;
  }
})();

export const stockByAddress = (a?: string) =>
  STOCKS.find((s) => s.address.toLowerCase() === (a || '').toLowerCase());
