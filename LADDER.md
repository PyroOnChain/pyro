# LADDER

A memecoin whose creator fees are collected in ETH and spent on whole shares of
tokenized NVDA. The treasury is one public address, so the number on the site is
something a visitor can check rather than something they have to believe.

Not deployed. Nothing here has launched yet.

## The two assets

Fees are earned in ETH and the treasury is filled with NVDA, so a swap happens
between the two. Nobody can verify that step from the page: it is a person
moving money. What the page can prove is the far end, which is why the bar reads
the treasury's NVDA balance rather than anything upstream of it.

The copy is derived from this rather than written down twice. `feesAreLadderStock()`
is false here, so the first two beats say fees are swapped for stock on the way in
and that only the treasury side shows up on the page. Point `TOKEN.quote` at a
stock the ladder buys and they change on their own.

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
| Fees waiting on Pons | `balanceOf(FEE_WALLET)` for a native quote, `balanceOfToken(FEE_WALLET, quote)` for a token one |

The escrow keeps native and token fees in two separate ledgers, so which call
answers depends on what the coin is priced against. `TOKEN.quote` in the config
picks it, and decimals travel with it: USDG is 6, not 18.

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

1. Launch the coin on Pons and set `TOKEN.quote` to whatever it is actually
   priced against (`QUOTES.ETH`, `QUOTES.USDG`, or one of the stocks).
   If the quote is a stock the ladder buys, fees arrive as the asset itself and
   nothing is converted. Otherwise they are swapped for stock when routed, and
   the landing copy says so on its own: the first two beats are derived from
   `feesAreLadderStock()` rather than written down twice.
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
