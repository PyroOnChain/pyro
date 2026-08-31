'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { robinhoodChain } from './chain';

/**
 * Guards every write. Without this a user whose wallet sits on Ethereum can reach a
 * signing prompt and broadcast to the wrong network: the app would happily build the
 * transaction, and the wallet would happily send it somewhere the contracts do not exist.
 *
 * switchChain also asks the wallet to ADD the network when it is not present, which it
 * usually is not, since Robinhood Chain is not built into any wallet by default.
 */
export function useCorrectChain() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const wrongChain = isConnected && chainId !== robinhoodChain.id;

  return {
    wrongChain,
    switching: isPending,
    switchToPyro: () => switchChain({ chainId: robinhoodChain.id }),
  };
}
