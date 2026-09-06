import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { robinhoodChain } from './chain';

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected({ shimDisconnect: true })],
  transports: { [robinhoodChain.id]: http() },
  // This app is a static export with no server render, so ssr must be off.
  // With it on, wagmi assumes the server hydrates state and skips restoring
  // from localStorage, which made the wallet ask to connect on every reload.
  ssr: false,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
