/**
 * A tokenized stock on Robinhood Chain. balanceOf is the raw ledger amount;
 * uiMultiplier (ERC-8056) is how splits and dividends are applied without ever
 * rewriting balances. Verified live: AAPL already sits at 1.000566e18 while the
 * other three are exactly 1e18, so a share count taken from the raw balance
 * alone is wrong today, not merely wrong in principle.
 */
export const stockAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'uiMultiplier', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

/**
 * The Pons fee escrow at 0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e.
 *
 * Signatures recovered from live mainnet logs rather than a published ABI: the
 * four event topics that address emits were matched against candidate signatures
 * until the hashes agreed, then checked against the layout of real logs (how many
 * topics were indexed, how wide the data was).
 *
 *   Credited      (recipient, source, amount)          native fees
 *   CreditedToken (recipient, token, source, amount)   stock fees
 *   Claimed       (recipient, amount)
 *   ClaimedToken  (recipient, token, amount)
 *
 * The page reads balanceOfToken instead of summing CreditedToken, because this
 * chain's public RPC times out on any eth_getLogs range wider than about 10k
 * blocks, and no browser is going to walk 52M blocks of history to add them up.
 */
export const feeEscrowAbi = [
  {
    type: 'function',
    name: 'balanceOfToken',
    stateMutability: 'view',
    inputs: [{ name: 'recipient', type: 'address' }, { name: 'token', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export const FEE_ESCROW = '0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e' as const;
