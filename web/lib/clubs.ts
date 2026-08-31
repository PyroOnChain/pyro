'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { clubfactoryAbi, clubvaultAbi, stockTokenAbi } from './abis';
import { CLUB_FACTORY } from './addresses';

export const ZERO = '0x0000000000000000000000000000000000000000' as Address;

export const factoryDeployed = () => Boolean(CLUB_FACTORY && CLUB_FACTORY.length === 42);

const VAULT_FIELDS = [
  'asset', 'name', 'symbol', 'totalAssets', 'totalSupply', 'creator',
  'creatorFeeBps', 'exitFeeBps', 'harvestBountyBps', 'lockedProfit', 'currentMascot',
  // Shares are NOT 18 decimals. ERC4626 adds our _decimalsOffset() of 3 (virtual shares,
  // which block the inflation attack), so share decimals are asset decimals + 3 = 21.
  // Formatting shares or NAV as 18dp is off by 1000x.
  'decimals',
] as const;

export type ClubSummary = {
  address: Address;
  asset?: Address;
  name?: string;
  symbol?: string;
  totalAssets?: bigint;
  totalSupply?: bigint;
  creator?: Address;
  creatorFeeBps?: number;
  exitFeeBps?: number;
  harvestBountyBps?: number;
  lockedProfit?: bigint;
  mascot?: Address;
  assetSymbol?: string;
  shareDecimals?: number;
  mascotSymbol?: string;
  mascotName?: string;
};

/** Every club address the factory has ever created. */
export function useClubAddresses() {
  const len = useReadContract({
    address: CLUB_FACTORY as Address,
    abi: clubfactoryAbi,
    functionName: 'allClubsLength',
    query: { enabled: factoryDeployed() },
  });

  const count = len.data ? Number(len.data) : 0;
  const list = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: CLUB_FACTORY as Address,
      abi: clubfactoryAbi,
      functionName: 'allClubs',
      args: [BigInt(i)],
    })),
    query: { enabled: factoryDeployed() && count > 0 },
  });

  const addresses = (list.data ?? [])
    .map((r) => (r.status === 'success' ? (r.result as Address) : undefined))
    .filter(Boolean) as Address[];

  return { addresses, isLoading: len.isLoading || list.isLoading, error: len.error ?? list.error };
}

/** Batched detail for many vaults at once, through Multicall3. */
export function useClubSummaries(addresses: Address[]) {
  const { data, isLoading } = useReadContracts({
    contracts: addresses.flatMap((address) =>
      VAULT_FIELDS.map((functionName) => ({ address, abi: clubvaultAbi, functionName }))
    ),
    query: { enabled: addresses.length > 0 },
  });

  const assets = addresses.map((_, i) => {
    const slice = (data ?? []).slice(i * VAULT_FIELDS.length, (i + 1) * VAULT_FIELDS.length);
    return slice[0]?.status === 'success' ? (slice[0].result as Address) : undefined;
  });

  // Read the symbol off each asset token rather than trusting a hardcoded address table,
  // so a club holding any enabled stock renders correctly.
  const symbols = useReadContracts({
    contracts: assets.filter(Boolean).map((address) => ({
      address: address as Address, abi: stockTokenAbi, functionName: 'symbol',
    })),
    query: { enabled: assets.some(Boolean) },
  });
  const symbolByAsset = new Map<string, string>();
  assets.filter(Boolean).forEach((a, i) => {
    const r = symbols.data?.[i];
    if (r?.status === 'success') symbolByAsset.set((a as string).toLowerCase(), r.result as string);
  });

  // The mascot is just an ERC-20, so ask it what it is called rather than showing an address.
  const mascots = addresses.map((_, i) => {
    const slice = (data ?? []).slice(i * VAULT_FIELDS.length, (i + 1) * VAULT_FIELDS.length);
    const m = slice[10]?.status === 'success' ? (slice[10].result as Address) : undefined;
    return m && m !== ZERO ? m : undefined;
  });
  const mascotReads = useReadContracts({
    contracts: mascots.filter(Boolean).flatMap((address) => [
      { address: address as Address, abi: stockTokenAbi, functionName: 'symbol' } as const,
      { address: address as Address, abi: stockTokenAbi, functionName: 'name' } as const,
    ]),
    query: { enabled: mascots.some(Boolean) },
  });
  const mascotSymbolByAddress = new Map<string, string>();
  const mascotNameByAddress = new Map<string, string>();
  mascots.filter(Boolean).forEach((m, i) => {
    const sym = mascotReads.data?.[i * 2];
    const nm = mascotReads.data?.[i * 2 + 1];
    if (sym?.status === 'success') mascotSymbolByAddress.set((m as string).toLowerCase(), sym.result as string);
    if (nm?.status === 'success') mascotNameByAddress.set((m as string).toLowerCase(), nm.result as string);
  });

  const clubs: ClubSummary[] = addresses.map((address, i) => {
    const slice = (data ?? []).slice(i * VAULT_FIELDS.length, (i + 1) * VAULT_FIELDS.length);
    const val = (n: number) => (slice[n]?.status === 'success' ? slice[n].result : undefined);
    return {
      address,
      asset: val(0) as Address | undefined,
      name: val(1) as string | undefined,
      symbol: val(2) as string | undefined,
      totalAssets: val(3) as bigint | undefined,
      totalSupply: val(4) as bigint | undefined,
      creator: val(5) as Address | undefined,
      creatorFeeBps: val(6) !== undefined ? Number(val(6)) : undefined,
      exitFeeBps: val(7) !== undefined ? Number(val(7)) : undefined,
      harvestBountyBps: val(8) !== undefined ? Number(val(8)) : undefined,
      lockedProfit: val(9) as bigint | undefined,
      mascot: val(10) as Address | undefined,
      shareDecimals: val(11) !== undefined ? Number(val(11)) : undefined,
      assetSymbol: symbolByAsset.get(((val(0) as string) || '').toLowerCase()),
      mascotSymbol: mascotSymbolByAddress.get(((val(10) as string) || '').toLowerCase()),
      mascotName: mascotNameByAddress.get(((val(10) as string) || '').toLowerCase()),
    };
  });

  return { clubs, isLoading };
}

/** One club, plus the connected wallet's position in it. */
export function useClub(vault: Address, user?: Address) {
  const base = useReadContracts({
    contracts: [
      ...VAULT_FIELDS.map((functionName) => ({ address: vault, abi: clubvaultAbi, functionName })),
      { address: vault, abi: clubvaultAbi, functionName: 'pendingFees' },
      { address: vault, abi: clubvaultAbi, functionName: 'mascotCount' },
    ],
    query: { enabled: Boolean(vault) },
  });

  const r = base.data ?? [];
  const at = (n: number) => (r[n]?.status === 'success' ? r[n].result : undefined);
  const asset = at(0) as Address | undefined;

  const assetMeta = useReadContract({
    address: asset, abi: stockTokenAbi, functionName: 'symbol',
    query: { enabled: Boolean(asset) },
  });

  const mascotAddr = at(10) as Address | undefined;
  const mascotMeta = useReadContracts({
    contracts: mascotAddr && mascotAddr !== ZERO
      ? [
          { address: mascotAddr, abi: stockTokenAbi, functionName: 'symbol' },
          { address: mascotAddr, abi: stockTokenAbi, functionName: 'name' },
        ]
      : [],
    query: { enabled: Boolean(mascotAddr && mascotAddr !== ZERO) },
  });

  const position = useReadContracts({
    contracts: user && asset
      ? [
          { address: vault, abi: clubvaultAbi, functionName: 'balanceOf', args: [user] },
          { address: asset, abi: stockTokenAbi, functionName: 'balanceOf', args: [user] },
          { address: asset, abi: stockTokenAbi, functionName: 'uiMultiplier' },
          { address: asset, abi: stockTokenAbi, functionName: 'paused' },
        ]
      : [],
    query: { enabled: Boolean(user && asset) },
  });

  const p = position.data ?? [];
  const pAt = (n: number) => (p[n]?.status === 'success' ? p[n].result : undefined);
  const shares = pAt(0) as bigint | undefined;

  const redeemable = useReadContract({
    address: vault,
    abi: clubvaultAbi,
    functionName: 'previewRedeem',
    args: shares !== undefined ? [shares] : undefined,
    query: { enabled: shares !== undefined && shares > 0n },
  });

  return {
    isLoading: base.isLoading,
    club: {
      address: vault,
      asset,
      name: at(1) as string | undefined,
      symbol: at(2) as string | undefined,
      totalAssets: at(3) as bigint | undefined,
      totalSupply: at(4) as bigint | undefined,
      creator: at(5) as Address | undefined,
      creatorFeeBps: at(6) !== undefined ? Number(at(6)) : undefined,
      exitFeeBps: at(7) !== undefined ? Number(at(7)) : undefined,
      harvestBountyBps: at(8) !== undefined ? Number(at(8)) : undefined,
      lockedProfit: at(9) as bigint | undefined,
      mascot: at(10) as Address | undefined,
      shareDecimals: at(11) !== undefined ? Number(at(11)) : undefined,
      assetSymbol: assetMeta.data as string | undefined,
      mascotSymbol: mascotMeta.data?.[0]?.status === 'success' ? (mascotMeta.data[0].result as string) : undefined,
      mascotName: mascotMeta.data?.[1]?.status === 'success' ? (mascotMeta.data[1].result as string) : undefined,
    } as ClubSummary,
    pendingFees: at(12) as bigint | undefined,
    mascotCount: at(13) !== undefined ? Number(at(13)) : undefined,
    position: {
      shares,
      walletBalance: pAt(1) as bigint | undefined,
      uiMultiplier: pAt(2) as bigint | undefined,
      assetPaused: pAt(3) as boolean | undefined,
      redeemable: (redeemable.data as bigint | undefined) ?? (shares === 0n ? 0n : undefined),
    },
    refetch: () => { base.refetch(); position.refetch(); redeemable.refetch(); },
  };
}

/**
 * Assets backing one whole share, as an 18-decimal fixed point number.
 * Must scale by SHARE decimals (asset + 3), not 1e18, or it reads 1000x low.
 */
export function navPerShare(
  totalAssets?: bigint,
  totalSupply?: bigint,
  shareDecimals?: number
): bigint | undefined {
  if (totalAssets === undefined || totalSupply === undefined || totalSupply === 0n) return undefined;
  const d = BigInt(shareDecimals ?? 21);
  return (totalAssets * 10n ** d) / totalSupply;
}
