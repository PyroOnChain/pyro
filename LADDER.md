# LADDER

A memecoin whose creator fees are collected in tokenized stock and spent on whole
shares of it. The treasury is one public address, so the number on the site is
something a visitor can check rather than something they have to believe.

Not deployed. Nothing here has launched yet.

## Why there is no contract

There is no vault, no escrow of our own, and no automated fee routing. Fees are
claimed from Pons and sent to the treasury by hand.

That is a deliberate trade. It gives up "the code guarantees it" and gets back an
attack surface of zero: no custody, nothing to audit, nothing to exploit, and no
upgrade key worth stealing. What the site claims is narrowed to match. It reports
what the treasury actually holds, never what is owed to it or promised.

## What the site reads

Everything on the page comes from two live calls, refreshed every 15 seconds.

| Number | Source |
| --- | --- |
| Shares owned | `balanceOf(TREASURY)` on each stock, times `uiMultiplier() / 1e18` |
| Fees waiting on Pons | `balanceOfToken(FEE_WALLET, stock)` on the Pons escrow |

The multiplier is not optional. Tokenized stocks apply splits and dividends
through ERC-8056 rather than by rewriting balances, and AAPL already sits at
`1.000566e18`, so a share count taken from the raw balance is wrong today.

### The Pons escrow

`0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e` publishes no ABI. Its four events
were recovered by hashing candidate signatures against the topics that address
actually emits, then checking each against the layout of real logs:

```
Credited      (address indexed recipient, address indexed source, uint256 amount)
CreditedToken (address indexed recipient, address indexed token, address indexed source, uint256 amount)
Claimed       (address indexed recipient, uint256 amount)
ClaimedToken  (address indexed recipient, address indexed token, uint256 amount)
```

Summing `CreditedToken` would give total fees ever earned, which only ever goes
up and would make a nicer bar. The site does not do it: the public RPC times out
on any `eth_getLogs` range wider than about 10k blocks, and walking 52M blocks of
history in a browser is not a real option. `balanceOfToken` is one call.

## Going live

Every switch is in `ladder/lib/config.ts`.

1. Launch the coin on Pons priced against the stock in `TOKEN.quote`, so creator
   fees are denominated in that stock rather than in the coin.
2. Set `TOKEN.address`.
3. Set `TREASURY` to a fresh address that holds nothing else. Fund its gas from
   somewhere unconnected to any personal wallet, and do not sweep proceeds back
   into one. A single transfer between them links the two permanently, for
   everyone, forever.
4. Optionally set `FEE_WALLET`. It ships in the bundle, so only set it if that
   address is meant to be public. Left blank, the site hides the pending-fee
   number and says on the treasury page that fees are visible only once they
   arrive.
5. Edit `LADDER` if the rungs should differ.

Until `TREASURY` and `TOKEN.address` are set, the site renders a "not launched
yet" state instead of a zero it cannot source.

## Copy that must not drift

The coin is not backed by the treasury, holders have no claim on it, and nothing
is redeemable. The site says so on the landing page and in the footer. Those
lines are load-bearing, not boilerplate: the treasury only stays honest while the
claims stay this narrow.
