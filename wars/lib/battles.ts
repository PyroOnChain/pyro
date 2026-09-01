'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { BATTLE_FACTORY } from './addresses';
import { battleAbi, erc20Abi, factoryAbi } from './abi';

export const SIDE_A = 1;
export const SIDE_B = 2;

export type Phase = 'live' | 'awaiting' | 'settled';

export type BattleSummary = {
  address: Address;
  stock?: Address;
  tokenA?: Address;
  tokenB?: Address;
  symbolA?: string;
  symbolB?: string;
  nameA?: string;
  nameB?: string;
  startAt?: bigint;
  endAt?: bigint;
  peakA?: bigint;
  peakB?: bigint;
  settled?: boolean;
  winner?: number;
  totalHarvested?: bigint;
};

/** live while the clock runs, awaiting once it stops until someone settles it */
export function phaseOf(b: BattleSummary, now = Math.floor(Date.now() / 1000)): Phase {
  if (b.settled) return 'settled';
  if (b.endAt !== undefined && now >= Number(b.endAt)) return 'awaiting';
  return 'live';
}

/**
 * How the bar is split. Peaks include phantom liquidity on both sides, which is
 * identical for a given stock, so subtracting the smaller peak's floor would
 * distort it. Comparing the raw peaks is what the contract does, so the bar
 * shows the same thing the winner is decided on.
 */
export function tugSplit(peakA?: bigint, peakB?: bigint): [number, number] {
  const a = peakA ?? 0n;
  const b = peakB ?? 0n;
  const t = a + b;
  if (t === 0n) return [50, 50];
  const pa = Number((a * 10000n) / t) / 100;
  return [pa, 100 - pa];
}

const FIELDS = [
  'stock', 'tokenA', 'tokenB', 'startAt', 'endAt', 'peakA', 'peakB', 'settled', 'winner', 'totalHarvested',
] as const;

export function useBattleAddresses() {
  const { data, isLoading, refetch } = useReadContract({
    address: BATTLE_FACTORY || undefined,
    abi: factoryAbi,
    functionName: 'allBattles',
    query: { enabled: Boolean(BATTLE_FACTORY), refetchInterval: 15_000 },
  });
  return { addresses: (data as Address[] | undefined) ?? [], isLoading, refetch };
}

export function useBattleSummaries(addresses: Address[]) {
  const contracts = addresses.flatMap((address) =>
    FIELDS.map((functionName) => ({ address, abi: battleAbi, functionName }) as const)
  );

  const { data, isLoading } = useReadContracts({
    contracts,
    query: { enabled: addresses.length > 0, refetchInterval: 10_000 },
  });

  const base: BattleSummary[] = addresses.map((address, i) => {
    const slice = data?.slice(i * FIELDS.length, (i + 1) * FIELDS.length);
    const at = (k: number) => (slice?.[k]?.status === 'success' ? slice[k].result : undefined);
    return {
      address,
      stock: at(0) as Address | undefined,
      tokenA: at(1) as Address | undefined,
      tokenB: at(2) as Address | undefined,
      startAt: at(3) as bigint | undefined,
      endAt: at(4) as bigint | undefined,
      peakA: at(5) as bigint | undefined,
      peakB: at(6) as bigint | undefined,
      settled: at(7) as boolean | undefined,
      winner: at(8) !== undefined ? Number(at(8)) : undefined,
      totalHarvested: at(9) as bigint | undefined,
    };
  });

  // second pass for the token names, which need the addresses from the first
  const tokenCalls = base.flatMap((b) =>
    b.tokenA && b.tokenB
      ? ([
          { address: b.tokenA, abi: erc20Abi, functionName: 'name' },
          { address: b.tokenA, abi: erc20Abi, functionName: 'symbol' },
          { address: b.tokenB, abi: erc20Abi, functionName: 'name' },
          { address: b.tokenB, abi: erc20Abi, functionName: 'symbol' },
        ] as const)
      : []
  );
  const { data: tokenData } = useReadContracts({
    contracts: tokenCalls,
    query: { enabled: tokenCalls.length > 0 },
  });

  let cursor = 0;
  const battles = base.map((b) => {
    if (!b.tokenA || !b.tokenB) return b;
    const g = (k: number) => {
      const r = tokenData?.[cursor + k];
      return r?.status === 'success' ? (r.result as string) : undefined;
    };
    const out = { ...b, nameA: g(0), symbolA: g(1), nameB: g(2), symbolB: g(3) };
    cursor += 4;
    return out;
  });

  return { battles, isLoading };
}

export function useBattle(address?: Address) {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: address
      ? ([
          ...FIELDS.map((functionName) => ({ address, abi: battleAbi, functionName }) as const),
          { address, abi: battleAbi, functionName: 'winningWeight' },
          { address, abi: battleAbi, functionName: 'sideWeight', args: [SIDE_A] },
          { address, abi: battleAbi, functionName: 'sideWeight', args: [SIDE_B] },
          { address, abi: battleAbi, functionName: 'curveA' },
          { address, abi: battleAbi, functionName: 'curveB' },
        ] as const)
      : [],
    query: { enabled: Boolean(address), refetchInterval: 6_000 },
  });

  const at = (k: number) => (data?.[k]?.status === 'success' ? data[k].result : undefined);
  const tokenA = at(1) as Address | undefined;
  const tokenB = at(2) as Address | undefined;
  const stock = at(0) as Address | undefined;

  // Names and the stock's own symbol need a second pass, because their addresses
  // only exist once the first read lands. Reading the stock symbol from chain
  // rather than a hardcoded list means a stock we do not know still renders.
  const { data: meta } = useReadContracts({
    contracts: tokenA && tokenB && stock
      ? ([
          { address: tokenA, abi: erc20Abi, functionName: 'name' },
          { address: tokenA, abi: erc20Abi, functionName: 'symbol' },
          { address: tokenB, abi: erc20Abi, functionName: 'name' },
          { address: tokenB, abi: erc20Abi, functionName: 'symbol' },
          { address: stock, abi: erc20Abi, functionName: 'symbol' },
        ] as const)
      : [],
    query: { enabled: Boolean(tokenA && tokenB && stock) },
  });
  const m = (k: number) => (meta?.[k]?.status === 'success' ? (meta[k].result as string) : undefined);

  const summary: BattleSummary = {
    address: address as Address,
    stock: at(0) as Address | undefined,
    tokenA: at(1) as Address | undefined,
    tokenB: at(2) as Address | undefined,
    startAt: at(3) as bigint | undefined,
    endAt: at(4) as bigint | undefined,
    peakA: at(5) as bigint | undefined,
    peakB: at(6) as bigint | undefined,
    settled: at(7) as boolean | undefined,
    winner: at(8) !== undefined ? Number(at(8)) : undefined,
    totalHarvested: at(9) as bigint | undefined,
    nameA: m(0), symbolA: m(1), nameB: m(2), symbolB: m(3),
  };

  return {
    battle: summary,
    stockSymbol: m(4),
    winningWeight: at(10) as bigint | undefined,
    weightA: at(11) as bigint | undefined,
    weightB: at(12) as bigint | undefined,
    curveA: at(13) as Address | undefined,
    curveB: at(14) as Address | undefined,
    isLoading,
    refetch,
  };
}

export function useTokenMeta(token?: Address) {
  const { data } = useReadContracts({
    contracts: token
      ? ([
          { address: token, abi: erc20Abi, functionName: 'name' },
          { address: token, abi: erc20Abi, functionName: 'symbol' },
        ] as const)
      : [],
    query: { enabled: Boolean(token) },
  });
  return {
    name: data?.[0]?.status === 'success' ? (data[0].result as string) : undefined,
    symbol: data?.[1]?.status === 'success' ? (data[1].result as string) : undefined,
  };
}
