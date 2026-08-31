# Verified on-chain, Robinhood Chain mainnet (chainId 4663 / 0x1237)
# Every address below was read directly from the chain, not copied from a blog post.

## Stock tokens
NVDA (NVIDIA - Robinhood Token)  0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC
  - BeaconProxy; beacon == AccessControlsRegistry (shared across all ~200 stock tokens)
  - impl 0xb35490d6f9163de4f80d88dc75c3516eb64c5ae2
  - 18 decimals, totalSupply ~43,406.7 at time of research
  - Selectors present: transfer/transferFrom/approve/allowance/balanceOf/totalSupply/
    name/symbol/decimals/permit/nonces/DOMAIN_SEPARATOR/eip712Domain/supportsInterface/
    mint(address,uint256)/burn(address,uint256)/pause/unpause/paused/
    hasRole(bytes32,address)/isBlocked(address)
  - BLOCKLIST, not allowlist. No ERC-3643/ERC-1404/identityRegistry/holder cap.
  - => a permissionless vault CAN custody this.
  - !! mint/burn/pause exist and are held by the registry. NEVER cache totalAssets.

AccessControlsRegistry           0xe10b6f6B275de231345c20D14Ab812db62151b00

## Pons v2
Factory                          0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e
FeeEscrow                        0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e
MemeHook                         0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044
BuybackVault                     0x42df2a798f82289E177311362e8f5ccC45c1219c
LaunchLocker                     0x267444D099b10fB5Ed7c3Cc7B7c767AdcA574952
LaunchAndBuy                     0xe33E9E479dF8802cb0866d5d05258bEc4cF62948
factory.owner()                  0x263ed295dafae1d9aadd6e56c4b6f9f38ee019dd  <-- can setCreatorFeeRecipient
maxCreatorTaxBps()               1000 (10%)
launchFee()                      0.0005 ether

## THE UNLOCK: NVDA is a registered Pons pair token
pairTokenEconomics(NVDA) -> (phantomQuote 16.64e18, graduationThreshold 41.6e18, decimals 18)
pairTokenEconomics(0x0)  -> (0,0,0)  [unsupported, control case]
Reserve check: 16.64/(16.64+41.6) = 28.57% of supply -> matches the ETH config's
4.2e18 threshold at the same 2.5x ratio. Same curve shape, scaled per asset.

=> Pair the mascot against NVDA. Creator fees then accrue in NVDA.
=> No swap, no oracle, no slippage, no MEV in the harvest path.

## ERC-8056 verified independently (eth_call, this machine)
uiMultiplier() = 0xa60bf13d | balanceOfUI(address) = 0x437a9958 | totalSupplyUI() = 0x9bea6429
  NVDA  uiMultiplier=1.000000000000  totalSupply(raw)=43,406.70  totalSupplyUI=43,406.70
  AAPL  uiMultiplier=1.000566080061  totalSupply(raw)= 6,913.61  totalSupplyUI= 6,917.52  <-- dividends
  TSLA  uiMultiplier=1.000000000000  totalSupply(raw)= 5,549.22  totalSupplyUI= 5,549.22
=> raw and UI diverge by exactly the multiplier. Account in RAW; display in UI.

## FeeEscrow claim scoping verified independently (bytecode selector table, 1932 bytes, 19 selectors)
PRESENT: claim() claim(uint256) claimToken(address) claimToken(address,uint256)
         balanceOf(address) balanceOfToken(address,address) credit(address) creditToken(address,address,uint256)
ABSENT:  claimFor(address) claimFor(address,address) claimTokenFor(address,address)
         claimOnBehalf(address) claimTo(address) claimToken(address,address) harvestFor(address)
=> no third-party claim path exists. The vault must call claim itself. This is why ClubVault.harvest() exists.
PonsFactory.feeEscrow() -> 0xd3afeb2a57f70ef218aa82451c51b2fb0416ac9e (matches)

## Pons integration verified by live simulation (cast call against mainnet)
Our TokenParams struct hashes to the selector the deployed factory actually dispatches:
  launchToken((string,string,string,string,(string,string,string,string,string),
              address,uint16,bool,bytes32,bytes32),uint256,address) = 0xf35abbcf  PRESENT in factory
  launchAndBuy(same struct,...)                                     = 0xf85f8e41  PRESENT on
              LaunchAndBuy 0xe33E9E479dF8802cb0866d5d05258bEc4cF62948, ABSENT on the factory.

Simulated launchToken(params, 0, NVDA):
  with no value    -> revert LaunchFeeNotPaid (0x7e6d78a5)   [dispatch + struct decode OK]
  with 0.0005 ETH  -> SUCCESS, returned token 0x7aA565bd5A46D6129Bd5703A762016C58331BaBa
                                       curve 0x4B67d5629E72B83c180Ed5Ad687F688D1484E3aB
=> a real NVDA-paired mascot launch works against the live factory.

getLaunchConfig(0) decoded: supply 1e27 (1B x 18dp), fee 100, phantomQuote 1.68e18,
  graduationThreshold 4.2e18, creatorTaxBps 200, flag 1.
  The ETH phantom/threshold ratio (1.68 : 4.2) is the same 2.5x as NVDA's (16.64 : 41.6).
