# Stock Wars — deployed addresses

All verified against live Robinhood Chain (chain id 4663, `https://rpc.mainnet.chain.robinhood.com`).

| What | Address |
|---|---|
| BattleFactory | `0x0Be67889010dd3C21F75b49fEBC421e2556433bD` |
| Battle implementation | `0xabB81b9fcb8D2Be2b54BE126c20B9dBA3c8f946F` |
| Owner | `0x6b2Ab8cd421B00599aAc992f8636BA1914680fbe` |
| Pons v2 factory | `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` |
| Pons fee escrow | `0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e` |

Match length 3600s. New matches are not paused. Anyone may start one.

Every match is deployed as its own clone. That is not a style choice: the Pons
escrow pays a lump sum per (recipient, quote asset), so a shared arena holding
fee rights for several matches would receive one undifferentiated pile of stock
with no way to attribute it. A separate address per match keeps each balance
separable.

## Stocks a match can be fought in

| Symbol | Token | Minimum seed per side |
|---|---|---|
| NVDA | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` | 0.01 |
| AAPL | `0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9` | 0.01 |
| TSLA | `0x322F0929c4625eD5bAd873c95208D54E1c003b2d` | 0.01 |
| AMZN | `0x12f190a9F9d7D37a250758b26824B97CE941bF54` | 0.01 |

Starting a match also costs 0.001 ETH, which is two Pons launch fees. The factory
forwards exactly that and refunds the rest.

## Not audited

The arena custodies every participant's coins for the length of a match. That is
the largest surface in this codebase and it has not been audited.
