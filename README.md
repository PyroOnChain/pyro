# Clubs

A group jar for one tokenized stock, on Robinhood Chain.

Deposit NVDA. The club launches one mascot memecoin on Pons, **paired against NVDA itself**.
Every mascot trade accrues creator fees denominated in NVDA. `harvest()` pulls them into the jar.
Everyone's slice grows. Leave whenever, take your share of the NVDA.

## Why pair the mascot against the stock

The obvious design pays creator fees in ETH and swaps ETH -> NVDA on every harvest. That drags in
a DEX dependency, slippage, an oracle, sandwich risk, and a failure mode when the pool is thin.

`pairTokenEconomics(NVDA)` returns `(16.64e18, 41.6e18, 18)` on mainnet -- NVDA is a registered
Pons pair asset. So the mascot's curve is denominated in NVDA, creator fees arrive as NVDA, and
the vault just calls `claimToken(NVDA)`.

**There is no swap anywhere in this codebase.** That is the entire architectural bet.

Confirmed supported pair assets: NVDA (41.6), AAPL (24.2), TSLA (26.0), AMZN (29.33) -- all ~$9k
equivalent to graduate. WETH is not a pair asset. USDG is (threshold in 6 decimals).

## Layout

| | |
|---|---|
| `src/ClubVault.sol`     | ERC-4626 jar. Drip, exit fee, harvest, timelocked escape hatch. |
| `src/ClubFactory.sol`   | Opens a club: deploy jar + launch mascot + bind fees, one tx. |
| `src/interfaces/`       | Pons v2 and stock-token interfaces, ABI taken from docs + on-chain. |
| `ADDRESSES.md`          | Every mainnet address, and how it was verified. |

## Three things that are load-bearing

**Never cache `totalAssets`.** The issuer holds `mint`/`burn`/`pause` on the stock token and can
upgrade it through a shared beacon. `totalAssets()` reads the live balance so an issuer burn
socializes across all holders instead of letting the first exiter drain the rest.
Test: `test_IssuerBurn_SocializesLossAndDoesNotLetFirstExiterDrainVault`.

**Account in raw balances, display in UI amounts.** The stock tokens implement ERC-8056
(Scaled UI Amount): dividends and splits move `uiMultiplier()` while raw `balanceOf` never
changes. Raw accounting means dividends accrue pro-rata to shareholders for free. The frontend
multiplies by `uiMultiplier()` for display. Test: `test_UiMultiplierChange_DoesNotAffectRawAccounting`.

**The fee-recipient escape hatch is mandatory.** Pons allows only the *current* recipient to call
`transferCreatorFeeRecipient`. With the vault as recipient and no passthrough, that setting is
frozen forever. It is also the most dangerous function here, so it is guardian-gated, timelocked
3 days, and the club creator can veto. Tests: `test_FeeRecipientChange_*`, `test_CreatorCanVeto*`.

## Harvest sniping

Harvested fees do not jump NAV. They enter a locked pile that drips linearly over 24h, so
deposit -> harvest -> withdraw in one block loses money (`test_CannotSnipeHarvestInSameBlock`).

Note the honest limit: this defeats the *atomic, risk-free* version. Someone who deposits after a
harvest and waits out the drip still shares in the remainder. Making harvests exclusive to holders
at harvest time needs a reward-index design instead of a NAV vault, which costs ERC-4626
composability. The drip plus the exit fee makes the attack not worth running at realistic sizes.

## Run

```bash
forge test -vv
forge script script/Deploy.s.sol:CheckPair --rpc-url rh_mainnet   # which tickers are pairable
TREASURY=0x.. GUARDIAN=0x.. OWNER=0x.. forge script script/Deploy.s.sol --rpc-url rh_mainnet --broadcast
```

## The web app

`web/` is a Next.js 15 app (wagmi v2 + viem) that talks to the contracts directly. ABIs are
generated from the forge artifacts, never hand-copied.

```bash
cd web && npm install && npm run dev
```

It reads clubs from the factory through Multicall3 (verified deployed on this chain at the
canonical address), and every route degrades to an honest "not deployed yet" screen until
`NEXT_PUBLIC_CLUB_FACTORY` is set.

| route | what it does |
|---|---|
| `/`                 | landing page |
| `/clubs`            | every club, jar size, creator cut, undripped fees |
| `/clubs/[address]`  | one club: deposit, withdraw, harvest |
| `/create`           | open a club, one transaction |

Deposits use ERC-2612 `permit`, so there is no separate approval transaction. If the wallet
refuses typed-data signing the panel silently falls back to approve-then-deposit rather than
dead-ending.

## Running it locally

```bash
./scripts/local.sh      # anvil + contracts + 3 seeded clubs + web/.env.local
cd web && npm run dev
```

## The keeper

Nothing calls `harvest()` on its own: Robinhood Chain has no Chainlink Automation or Gelato,
and the Pons escrow's claim functions are `msg.sender`-scoped so no third party can claim for a
vault. `keeper/` is a small viem process that polls every club and harvests the ones worth the
gas. It simulates before sending, so a club with nothing to claim costs nothing.

```bash
cd keeper && cp .env.example .env   # fill in, then
npm start
```

The 0.25% bounty means strangers take this over once clubs have volume, which is the point.

## Open items

- `TokenParams.expectedEconomics` is a `bytes32` commitment whose derivation is not documented.
  Zero works: the fork test creates real clubs against the live factory with it set to zero,
  so it reads as "no economics check requested". Fine to ship.
- A keeper is required. Pons `claim()` is `msg.sender`-scoped, and no automation network
  (Chainlink Automation, Gelato) supports Robinhood Chain. `harvest()` pays a 0.25% bounty.
- Stock tokens may not be held by US persons (also UK, CA, CH, UAE). Geo-gate the frontend.
- Pons' factory owner can call `setCreatorFeeRecipient` and redirect a token's creator fees.
  Ask `contact@ponsfamily.com` what the guardrails are for a contract-owned recipient.

## Is the Pons integration real?

Yes, and it is verified against the deployed contracts rather than against docs.

Our `TokenParams` struct hashes to the selector the live factory actually dispatches:

```
launchToken((string,string,string,string,(string,string,string,string,string),
            address,uint16,bool,bytes32,bytes32),uint256,address)  = 0xf35abbcf   present in factory
launchAndBuy(same struct, ...)                                     = 0xf85f8e41   present on
        LaunchAndBuy 0xe33E9E479dF8802cb0866d5d05258bEc4cF62948, absent on the factory
```

A single wrong field type or ordering would produce a different hash, so this is a real check.
Then we simulated the call against mainnet with `cast`:

```
launchToken(params, 0, NVDA), no value       -> revert LaunchFeeNotPaid (0x7e6d78a5)
launchToken(params, 0, NVDA), 0.0005 ETH     -> SUCCESS
                                                token 0x7aA565bd5A46D6129Bd5703A762016C58331BaBa
                                                curve 0x4B67d5629E72B83c180Ed5Ad687F688D1484E3aB
```

An NVDA-paired mascot launch works against the live Pons factory today. What has NOT happened is
a real broadcast transaction, so the untested surface is state changes, not encoding.
