import type { Address } from 'viem';

/** Set once deployed. Empty renders a "not live yet" page rather than a broken one. */
export const BATTLE_FACTORY = (process.env.NEXT_PUBLIC_BATTLE_FACTORY || '') as Address | '';

export const factoryDeployed = () => BATTLE_FACTORY !== '';

export type Stock = { symbol: string; name: string; address: Address; graduation: string; phantom: string };

/** Pair assets Pons will price a launch against. Verified on mainnet. */
export const STOCKS: Stock[] = [
  { symbol: 'NVDA', name: 'NVIDIA', address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC', graduation: '41.6', phantom: '16.64' },
  { symbol: 'AAPL', name: 'Apple', address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9', graduation: '24.2', phantom: '9.68' },
  { symbol: 'TSLA', name: 'Tesla', address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d', graduation: '26.0', phantom: '10.40' },
  { symbol: 'AMZN', name: 'Amazon', address: '0x12f190a9F9d7D37a250758b26824B97CE941bF54', graduation: '29.33', phantom: '11.73' },
];

export const stockByAddress = (a?: string) =>
  a ? STOCKS.find((s) => s.address.toLowerCase() === a.toLowerCase()) : undefined;
