'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { PONS_FACTORY } from './addresses';

/**
 * How far a mascot is from graduating.
 *
 * This matters more than it looks. On the bonding curve the quote asset simply
 * accumulates in the curve contract: nothing is credited to the fee escrow, so
 * the jar earns nothing yet. Creator fees are charged by the launchpad's hook
 * on the pool that exists AFTER graduation. Verified on a live club: a real buy
 * put NVDA on the curve and left the escrow at zero.
 *
 * So a club's members need to know how far off graduation is. Until then, the
 * jar holds exactly what was deposited into it.
 */

const ponsAbi = [
  {
    type: 'function', name: 'getLaunchedToken', stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [
      { type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'address' },
      { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' },
      { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' },
      { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' },
    ],
  },
  {
    type: 'function', name: 'pairTokenEconomics', stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint8' }],
  },
] as const;

const curveAbi = [
  { type: 'function', name: 'quoteReserve', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'graduated', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
] as const;

export type Graduation = {
  graduated: boolean;
  raised: bigint;   // real quote asset put in by buyers
  needed: bigint;   // how much buying it takes in total
  progress: number; // 0..1
};

export function useGraduation(mascot?: Address, asset?: Address): Graduation | null {
  const launch = useReadContract({
    address: PONS_FACTORY, abi: ponsAbi, functionName: 'getLaunchedToken',
    args: mascot ? [mascot] : undefined,
    query: { enabled: Boolean(mascot) },
  });

  const economics = useReadContract({
    address: PONS_FACTORY, abi: ponsAbi, functionName: 'pairTokenEconomics',
    args: asset ? [asset] : undefined,
    query: { enabled: Boolean(asset) },
  });

  const curve = launch.data?.[1] as Address | undefined;

  const curveState = useReadContracts({
    contracts: curve
      ? [
          { address: curve, abi: curveAbi, functionName: 'quoteReserve' },
          { address: curve, abi: curveAbi, functionName: 'graduated' },
        ]
      : [],
    query: { enabled: Boolean(curve) },
  });

  const reserve = curveState.data?.[0]?.status === 'success' ? (curveState.data[0].result as bigint) : undefined;
  const isGrad = curveState.data?.[1]?.status === 'success' ? (curveState.data[1].result as boolean) : undefined;
  const phantom = economics.data?.[0] as bigint | undefined;
  const threshold = economics.data?.[1] as bigint | undefined;

  if (reserve === undefined || phantom === undefined || threshold === undefined) return null;

  // The curve opens holding a phantom reserve, so real money in is the excess.
  const raised = reserve > phantom ? reserve - phantom : 0n;
  const needed = threshold > phantom ? threshold - phantom : 1n;

  return {
    graduated: Boolean(isGrad),
    raised,
    needed,
    progress: Math.min(1, Number(raised) / Number(needed)),
  };
}
