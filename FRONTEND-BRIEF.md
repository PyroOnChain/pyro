# Front-end brief

For rebuilding the club-vault front end in Emergent (or anything else). The
contracts are deployed and unchanged; this describes only the UI that sits on
top of them.

Replace `<NAME>` throughout once the brand is decided.

## What the product does

Deposit a tokenized stock (NVDA) into a shared vault and receive transferable
share tokens. The club launches a mascot memecoin on Pons **priced against that
same stock**, with the vault set as the creator-fee recipient. Every trade of the
mascot sends fees back into the vault as more NVDA, so the vault's assets grow
and each share is worth more stock than it was.

The share price only moves up from fees. It is not a price feed and not a bet on
the mascot: holders own stock, not the memecoin.

## Deployed

| | |
| --- | --- |
| Chain | Robinhood Chain, 4663 |
| ClubFactory | `0x3ed75cd8da57a222689f37d8bf2a1976516310c0` |
| NVDA | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` |
| Pons factory | `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` |

Vaults are ERC-4626 and their shares are ERC-20.

## Screens

### 1. Landing
Explain the mechanic in the order above: deposit, mascot launches, fees return as
stock, share price climbs. One primary action into the clubs list.

### 2. Clubs
Every club, from `allClubsLength()` then `allClubs(i)`. Each card shows the club
name and symbol, the underlying stock, total assets held, share price, and
whether a mascot is live yet.

Empty state matters: at the time of writing there are three test clubs holding
0.01 NVDA each. Design for near-empty, not for a full page.

### 3. Club detail
The main screen. Deposit and withdraw, plus the club's numbers and its mascot.

### 4. Create a club
A form: pick the stock, set the seed, name and symbol the club, name and ticker
the mascot, set the creator fee. Needs ETH for the Pons launch fee.

## Contract calls

Reads, per vault:

| Shows | Call |
| --- | --- |
| Club name / ticker | `name()` / `symbol()` |
| Underlying stock | `asset()` |
| Total stock held | `totalAssets()` |
| Shares outstanding | `totalSupply()` |
| Share price | `convertToAssets(1e18)` |
| Your shares | `balanceOf(you)` |
| Your shares in stock | `convertToAssets(balanceOf(you))` |
| Fees earned but not yet released | `lockedProfit()` |
| Fees claimable from Pons | `pendingFees()` |
| Mascot token | `currentMascot()`, `mascotCount()` |
| Deposit preview | `previewDeposit(assets)` |
| Withdraw preview | `previewRedeem(shares)` |
| Withdraw ceiling | `maxWithdraw(you)` |

Writes:

| Action | Call |
| --- | --- |
| Approve before first deposit | `approve(vault, amount)` on the stock |
| Deposit | `deposit(assets, you)` |
| Withdraw | `redeem(shares, you, you)` |
| Pull fees in from Pons | `harvest()` — permissionless, pays a bounty |
| Create a club | `createClub(asset, seed, clubName, clubSymbol, creatorFeeBps, params, launchConfigId)`, payable |

## Things that are easy to get wrong

**Shares are not stock.** Always show both: shares held, and what they are worth
in stock right now. People will read one number and assume it is the other.

**Deposits need approval first.** Two transactions the first time. The UI has to
handle the approve step, not assume a single click.

**`lockedProfit` exists so a harvest cannot be sandwiched.** Fees release
gradually rather than landing in one block. So `totalAssets()` climbs smoothly
and a big harvest does not instantly reprice shares. Worth surfacing as something
like "releasing over the next few hours" rather than hiding it.

**Stock tokens use ERC-8056 `uiMultiplier`.** Splits and dividends move the
multiplier instead of rewriting balances, and AAPL is already at 1.000566, not 1.
Any stock amount shown to a user is `balance × uiMultiplier() / 1e18`. Reading
the raw balance gives a wrong number today, not hypothetically.

**`harvest()` is permissionless and pays a bounty.** Anyone can call it. Worth a
visible button, since it is the thing that actually moves the share price.

**Never cache `totalAssets`.** The stock tokens have `mint`, `burn` and `pause`
held by a registry, so supply can change under you.

## What to tell Emergent

> Build a static React front end, no backend and no database. All data comes from
> a blockchain the app reads directly in the browser, so do not create API routes,
> a server, or a database schema. Put every number the UI displays in one mock
> data file with clearly named fields, so the real data source can be swapped in
> afterwards. Vite or Next.js static export both work. Dark theme.

Then hand me the export and I add wagmi, viem, wallet connection and the calls
above, replacing the mock file.

## Deployment

Static export to Cloudflare Pages, same as the other sites. The Pages project
builds whichever app occupies `web/`, so this needs either its own project or a
directory swap.

---

## Restored app, now Totem

The original front end is restored at `clubs/`, recovered from git at
`f60d001^`, and renamed to **Totem**. Same visuals; logo and palette still to
change.

The live factory address is now baked into `lib/addresses.ts` instead of being
read from an env var, so a fresh clone builds into a working site. It reads the
three live clubs correctly: Jimothy ($JMT), Sneaky Snake ($SNK) and tripi tropa
($TRIPPI), 0.01 NVDA each.

### This app is not purely static

Unlike the other two sites, it ships Cloudflare Pages Functions under
`functions/api/`, which need an **R2 bucket bound as `IMAGES`** (typed `R2Bucket`, not KV):

| Route | Purpose |
| --- | --- |
| `POST /api/upload` | mascot images, since the launchpad caps its logo field at 512 chars |
| `/api/club-meta` | mascot picture and links, which Pons stores off-chain with no getter |
| `/api/club-meta/[vault]` | every record filed for a club, keyed by signer |
| `/api/img/[name]` | serves an uploaded image |

Without that binding those routes 404 and mascot images do not render. Everything
else still works, because all vault state comes from the chain.

They 404 in `next dev` too; that is expected, since Pages Functions do not run
under it.

### Fixed on the way through

The metadata signing message disagreed between client and server: the client
signed `VaultTube club metadata` while the function verified `Pyro club
metadata`, left over from the first rebrand. `recoverMessageAddress` does not
fail on a wrong message, it returns a different address, so uploads returned 200,
records were filed under a bogus signer, and the client only ever displays
records whose signer matches `creator()`. Mascot metadata could never appear.
Both strings are now `Totem club metadata`.

### Deploy readiness

Builds clean, brand assets generated from `brand/totem-logo.jpg` by
`scripts/make-brand.py`, factory address baked in, security headers added.

Two things are still needed and neither is code:

**A domain.** `SITE` in `app/layout.tsx` is empty, so canonical and card URLs
are relative. One edit once it exists.

**An R2 bucket bound as `IMAGES`** on the Pages project. Without it the four
`/api/*` routes return 501 `not_configured` and mascot pictures do not render.
Vault state is unaffected: it all comes from the chain.

**And one conflict.** The Pages project builds whichever app occupies `web/`,
and that is currently Brawlz, live on brawlzz.com. Totem cannot go there without
taking Brawlz down. Three sites now exist against one project, so this needs a
second Pages project rather than another directory swap.

Assets are resampled with NEAREST throughout, never LANCZOS. The logo is pixel
art and smooth interpolation turns it to grey soup at icon sizes. The palette lives entirely in the
`:root` block of `app/globals.css` (a warm pastel set: cream `#FFF3E4` ground,
purple `#7C5BC7` accent, five-stop sunset gradient), and the name appears in
about 19 places across `app/layout.tsx`, `app/page.tsx`, the components and
`lib/addresses.ts`, plus a `switchToVaultTube` helper in `lib/useCorrectChain.ts`.
