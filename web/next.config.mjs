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
];

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(UNUSED_OPTIONAL.map((m) => [m, false])),
    };
    return config;
  },
};
