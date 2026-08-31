'use client';

import { useAccount, useSwitchChain } from 'wagmi';
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
  // useAccount().chainId is the chain the CONNECTED WALLET is actually on.
  // useChainId() is the config's active chain, which with a single chain configured is
  // always Robinhood Chain no matter where the wallet sits - so it can never detect a
  // mismatch. Using it here is what let a wallet on Ethereum reach a signing prompt.
  const { isConnected, chainId: walletChainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const wrongChain = isConnected && walletChainId !== robinhoodChain.id;

  return {
    walletChainId,
    wrongChain,
    switching: isPending,
    switchToPyro: () => switchChain({ chainId: robinhoodChain.id }),
  };
}
