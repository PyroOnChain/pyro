/**
 * wagmi's connectors barrel drags in the Base/Coinbase account SDK, which optionally
 * imports the x402 payment packages. We only ever use the injected connector, so those
 * code paths are unreachable. Alias them off rather than installing dependencies we
 * never execute.
 */
const UNUSED_OPTIONAL = [
  '@x402/core/client',
  '@x402/evm',
  '@x402/evm/exact/client',
  '@x402/evm/upto/client',
  '@x402/svm/exact/client',
  // WalletConnect's logger optionally pretty-prints; we never enable it.
  'pino-pretty',
  // MetaMask's SDK optionally imports React Native storage; browser-only here.
  '@react-native-async-storage/async-storage',
];

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // Fully static output: no server, no vendor lock-in, deployable to any static host.
  // Every page here renders from on-chain reads in the browser, so nothing needs SSR.
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(UNUSED_OPTIONAL.map((m) => [m, false])),
    };
    return config;
  },
};
