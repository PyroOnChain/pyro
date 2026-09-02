import { defineChain } from 'viem';

/** Verified live: eth_chainId returns 0x1237 (4663), gas token is ETH. */
export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' },
  },
  // Verified deployed at the canonical address (3,808 bytes of code) - batches our reads.
  contracts: {
    multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' },
  },
});

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.chain.robinhood.com'] } },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://explorer.testnet.chain.robinhood.com' },
  },
  testnet: true,
});

export const explorerTx = (hash: string) => `${robinhoodChain.blockExplorers.default.url}/tx/${hash}`;
export const explorerAddr = (a: string) => `${robinhoodChain.blockExplorers.default.url}/address/${a}`;
