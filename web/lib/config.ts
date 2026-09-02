import type { Address } from 'viem';

/**
 * Everything that changes between "not launched yet" and "live" lives in this
 * file, so going live is one edit and a redeploy.
 *
 * Nothing here is a secret. Every address in this file ends up in the shipped
 * JavaScript, which is the point: the numbers on the site are only worth
 * anything if a visitor can check them against the chain themselves.
 */

export const BRAND = {
  name: 'LADDER',
  ticker: 'LADDER',
  tagline: 'One whole share at a time.',
  /** Canonical origin, no trailing slash. Drives canonical URLs, OG tags and the sitemap. */
  site: 'https://platform-ladder.com',
  /** Blank until the account exists. Links to it are hidden rather than pointed at x.com. */
  x: '',
};

// --------------------------------------------------------------------- stocks

export type Stock = {
  symbol: string;
  name: string;
  address: Address;
  /** Tokenized stocks on Robinhood Chain are 18-decimal. Verified on NVDA. */
  decimals: number;
};

/** Pair assets Pons will price a launch against. Verified live on mainnet. */
export const STOCKS: Record<string, Stock> = {
  NVDA: { symbol: 'NVDA', name: 'NVIDIA', address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC', decimals: 18 },
  AAPL: { symbol: 'AAPL', name: 'Apple', address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9', decimals: 18 },
  TSLA: { symbol: 'TSLA', name: 'Tesla', address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d', decimals: 18 },
  AMZN: { symbol: 'AMZN', name: 'Amazon', address: '0x12f190a9F9d7D37a250758b26824B97CE941bF54', decimals: 18 },
};

// ----------------------------------------------------------- the quote asset

/**
 * What the coin is priced against on Pons, which decides what creator fees are
 * paid in. Two shapes, because the escrow keeps them in separate ledgers:
 * native fees come back from balanceOf, token fees from balanceOfToken.
 *
 * Decimals are not cosmetic here. USDG is 6, not 18.
 */
export type Quote =
  | { kind: 'native'; symbol: string; name: string; decimals: number }
  | { kind: 'erc20'; symbol: string; name: string; address: Address; decimals: number };

export const QUOTES = {
  ETH: { kind: 'native', symbol: 'ETH', name: 'Ether', decimals: 18 },
  USDG: { kind: 'erc20', symbol: 'USDG', name: 'Global Dollar', address: '0x5fc5360d0400a0fd4f2af552aDd042d716F1D168', decimals: 6 },
  NVDA: { kind: 'erc20', ...STOCKS.NVDA },
  AAPL: { kind: 'erc20', ...STOCKS.AAPL },
  TSLA: { kind: 'erc20', ...STOCKS.TSLA },
  AMZN: { kind: 'erc20', ...STOCKS.AMZN },
} satisfies Record<string, Quote>;

// ---------------------------------------------------------------- the project

/**
 * The public treasury. Whole shares live here and nowhere else, so this balance
 * IS the scoreboard. Use an address that holds nothing but treasury stock, and
 * fund its gas from somewhere unconnected to a personal wallet - the moment a
 * transfer links the two, the explorer links them for everyone.
 *
 * Empty until it exists; the site says "not funded yet" rather than showing a zero
 * it cannot source.
 */
export const TREASURY = '' as Address | '';

/**
 * Where Pons sends creator fees. OPTIONAL.
 *
 * Setting it adds one number to the page: fees credited but not yet claimed,
 * read straight out of the Pons escrow. Leaving it blank hides that number and
 * the site reports treasury holdings only, which is still fully checkable.
 *
 * Only set it if the wallet is meant to be public - it ships in the bundle.
 */
export const FEE_WALLET = '' as Address | '';

/** The coin itself, once it is launched on Pons. */
export const TOKEN = {
  address: '' as Address | '',
  /** Set this to whatever the launch is actually priced against. */
  quote: QUOTES.ETH as Quote,
};

/**
 * True when fees already arrive as something the ladder buys, so nothing has to
 * be converted on the way in. Changes what the site claims, so it is derived
 * rather than written down twice.
 */
export const feesAreLadderStock = (): boolean =>
  TOKEN.quote.kind === 'erc20' &&
  LADDER.some((r) => r.stock.address.toLowerCase() === (TOKEN.quote as { address: Address }).address.toLowerCase());

export const ponsUrl = (token: string) => `https://pons.fun/token/${token}`;

// --------------------------------------------------------------- the ladder

/**
 * The rungs, in order. Each is a whole number of shares of one stock, and a rung
 * is cleared when the treasury actually holds that much. Deliberately whole
 * shares: a fraction is a balance, a whole share is an event.
 */
export type Rung = { stock: Stock; shares: number };

export const LADDER: Rung[] = [
  { stock: STOCKS.NVDA, shares: 1 },
  { stock: STOCKS.NVDA, shares: 5 },
  { stock: STOCKS.NVDA, shares: 10 },
  { stock: STOCKS.NVDA, shares: 25 },
  { stock: STOCKS.NVDA, shares: 50 },
  { stock: STOCKS.NVDA, shares: 100 },
  { stock: STOCKS.NVDA, shares: 250 },
  { stock: STOCKS.NVDA, shares: 500 },
  { stock: STOCKS.NVDA, shares: 1000 },
];

export const isLive = () => TREASURY !== '' && TOKEN.address !== '';
