# Brawlz

Two memecoins launch in the same transaction, priced against the same tokenized
stock. One hour later the side with the higher **peak** market cap takes the
creator fees from both coins, paid in that stock, split by how much each backer
held and for how long.

Formerly Stock Wars. The contracts are unchanged; the rebrand is front-end only.

## Live

| | |
| --- | --- |
| Site | https://brawlzz.com |
| X | https://x.com/BrawlzCrypto |
| Chain | Robinhood Chain, 4663 |
| BattleFactory | `0x0Be67889010dd3C21F75b49fEBC421e2556433bD` |

Contract design, the escrow constraint that forces one clone per match, and the
custody model are documented in `STOCKWARS.md`, which still uses the old name
because the deployed contracts do.

## Deploying

The Cloudflare Pages project is wired to this repo with `web` as its root
directory and rebuilds on every push. Root directory is a dashboard setting that
a commit cannot change, so the app that should be live occupies `web/` and the
others are parked under their own names. Swapping two directory names swaps
which site is live.

| Setting | Value |
| --- | --- |
| Root directory | `web` |
| Build command | `npm run build` |
| Output directory | `out` |

Every custom domain on that project serves the same output, which is why
`platform-ladder.com` currently shows Brawlz too. Two sites live at once needs a
second Pages project.

## Palette

Green and white are the two corners. On pure black they carry equal weight, so
neither corner looks like the underdog before a punch is thrown, which two
arbitrary hues would not manage. Grey is never a side: it is structure and
defeat. The purse is a yellower green so a prize never reads as a corner.

Tokens are `--a`, `--b` and `--prize`. The green is `#12FE7E`, taken from the
logo rather than chosen separately.

## Brand assets

`scripts/make-brand.py` builds the header mark, favicon, apple icon, share card
and social avatar from `brand/brawlz-logo.jpg`. `scripts/make-banner.py` builds
the X header from a generated plate plus real type.

Type is composited rather than generated: image models render text unreliably,
and the wordmark has to match the site exactly.

The avatar is deliberately a baseline PNG with no metadata. The source logo is a
progressive JPEG, which some upload forms reject outright.

## Links

`lib/links.ts` holds the X account (`@BrawlzCrypto`) and the domain. Anything
left empty there is not rendered at all, so the site never shows a dead
placeholder.
