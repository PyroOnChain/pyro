'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { stockAbi, feeEscrowAbi, FEE_ESCROW } from './abi';
import { LADDER, TREASURY, FEE_WALLET, TOKEN, type Stock, type Rung } from './config';

const ONE = 10n ** 18n;

/** Raw balance -> shares actually owned, after the ERC-8056 multiplier. */
function toShares(raw: bigint, multiplier: bigint, decimals: number): number {
  const adjusted = multiplier > 0n ? (raw * multiplier) / ONE : raw;
  return Number(formatUnits(adjusted, decimals));
}

export type RungState = Rung & {
  index: number;
  cleared: boolean;
  /** The rung the treasury is working on right now. Exactly one, or none. */
  current: boolean;
  /** Where this rung starts counting: the previous target for the same stock. */
  from: number;
};

export type TreasuryState = {
  ready: boolean;
  /** Live share count per stock symbol, split-adjusted. */
  held: Record<string, number>;
  rungs: RungState[];
  current?: RungState;
  /** 0-1 through the current rung. 1 when the whole ladder is cleared. */
  progress: number;
  clearedCount: number;
  /** Creator fees credited on Pons but not yet claimed. Undefined when no fee wallet is published. */
  pendingFees?: number;
  pendingSymbol: string;
};

/** The distinct stocks the ladder touches, in first-appearance order. */
export const ladderStocks = (): Stock[] => {
  const seen = new Map<string, Stock>();
  for (const r of LADDER) if (!seen.has(r.stock.symbol)) seen.set(r.stock.symbol, r.stock);
  return [...seen.values()];
};

export function useTreasury(): TreasuryState {
  const stocks = useMemo(ladderStocks, []);
  const hasTreasury = TREASURY !== '';

  // One multicall for every balance and multiplier the ladder needs.
  const { data: stockData } = useReadContracts({
    allowFailure: true,
    contracts: hasTreasury
      ? stocks.flatMap((s) => [
          { address: s.address, abi: stockAbi, functionName: 'balanceOf', args: [TREASURY as `0x${string}`] } as const,
          { address: s.address, abi: stockAbi, functionName: 'uiMultiplier' } as const,
        ])
      : [],
    query: { enabled: hasTreasury, refetchInterval: 15_000 },
  });

  // Kept as its own call rather than folded into the array above: a mixed-ABI
  // contracts list defeats wagmi's return-type inference and lands everything
  // on unknown.
  //
  // The escrow keeps native and token fees in separate ledgers, so which function
  // answers depends on what the coin is priced against.
  const quote = TOKEN.quote;
  const { data: escrowData } = useReadContracts({
    allowFailure: true,
    contracts:
      FEE_WALLET !== ''
        ? [
            quote.kind === 'native'
              ? ({
                  address: FEE_ESCROW,
                  abi: feeEscrowAbi,
                  functionName: 'balanceOf',
                  args: [FEE_WALLET as `0x${string}`],
                } as const)
              : ({
                  address: FEE_ESCROW,
                  abi: feeEscrowAbi,
                  functionName: 'balanceOfToken',
                  args: [FEE_WALLET as `0x${string}`, quote.address],
                } as const),
          ]
        : [],
    query: { enabled: FEE_WALLET !== '', refetchInterval: 15_000 },
  });

  return useMemo(() => {
    const held: Record<string, number> = {};
    let ready = false;

    if (hasTreasury && stockData) {
      ready = true;
      stocks.forEach((s, i) => {
        const bal = stockData[i * 2];
        const mul = stockData[i * 2 + 1];
        if (bal?.status === 'success') {
          const m = mul?.status === 'success' ? (mul.result as bigint) : ONE;
          held[s.symbol] = toShares(bal.result as bigint, m, s.decimals);
        } else {
          held[s.symbol] = 0;
          ready = false;
        }
      });
    } else {
      for (const s of stocks) held[s.symbol] = 0;
    }

    // Walk the ladder in order and stop at the first rung the treasury has not
    // reached. Rungs are cumulative per stock, so a rung's starting line is the
    // previous target for that same stock.
    const priorTarget: Record<string, number> = {};
    let foundCurrent = false;
    const rungs: RungState[] = LADDER.map((r, index) => {
      const from = priorTarget[r.stock.symbol] ?? 0;
      priorTarget[r.stock.symbol] = r.shares;
      const cleared = ready && (held[r.stock.symbol] ?? 0) >= r.shares;
      const current = !cleared && !foundCurrent;
      if (current) foundCurrent = true;
      return { ...r, index, from, cleared: cleared && !current, current };
    });

    const current = rungs.find((r) => r.current);
    let progress = 1;
    if (current) {
      const have = held[current.stock.symbol] ?? 0;
      const span = current.shares - current.from;
      progress = span > 0 ? Math.min(1, Math.max(0, (have - current.from) / span)) : 0;
    }

    const pending = escrowData?.[0];
    const pendingFees =
      pending?.status === 'success'
        ? Number(formatUnits(pending.result as bigint, quote.decimals))
        : undefined;

    return {
      ready,
      held,
      rungs,
      current,
      progress,
      clearedCount: rungs.filter((r) => r.cleared).length,
      pendingFees,
      pendingSymbol: quote.symbol,
    };
  }, [stockData, escrowData, stocks, hasTreasury, quote]);
}
