#!/usr/bin/env bash
# Post-deploy sanity check. Reads the live factory back and confirms every wire is where it
# should be. Run this before you point the frontend at anything.
#
#   ./scripts/verify-deploy.sh 0xYourFactoryAddress
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"

FACTORY="${1:?usage: verify-deploy.sh <factory address>}"
RPC="${RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
PONS=0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e
ESCROW=0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e

pass=0; fail=0
chk() { # chk "label" "actual" "expected"
  if [ "$(echo "$2" | tr 'A-Z' 'a-z')" = "$(echo "$3" | tr 'A-Z' 'a-z')" ]; then
    printf "  ok    %-34s %s\n" "$1" "$2"; pass=$((pass+1))
  else
    printf "  FAIL  %-34s got %s, want %s\n" "$1" "$2" "$3"; fail=$((fail+1))
  fi
}
note() { printf "  ..    %-34s %s\n" "$1" "$2"; }

echo "factory $FACTORY on $RPC"
echo
echo "wiring"
chk "chain id"            "$(cast chain-id --rpc-url "$RPC")" "4663"
chk "pons factory"        "$(cast call --rpc-url "$RPC" "$FACTORY" 'pons()(address)')" "$PONS"
chk "fee escrow"          "$(cast call --rpc-url "$RPC" "$FACTORY" 'escrow()(address)')" "$ESCROW"

echo
echo "fees"
FEE=$(cast call --rpc-url "$RPC" "$FACTORY" 'protocolFeeBps()(uint16)')
chk "protocol fee starts at 0" "$FEE" "0"
note "max protocol fee (hardcoded)" "$(cast call --rpc-url "$RPC" "$FACTORY" 'MAX_PROTOCOL_FEE_BPS()(uint16)') bps"
note "default exit fee"            "$(cast call --rpc-url "$RPC" "$FACTORY" 'defaultExitFeeBps()(uint16)') bps"
note "default harvest bounty"      "$(cast call --rpc-url "$RPC" "$FACTORY" 'defaultBountyBps()(uint16)') bps"

echo
echo "roles"
note "owner"    "$(cast call --rpc-url "$RPC" "$FACTORY" 'owner()(address)')"
note "guardian" "$(cast call --rpc-url "$RPC" "$FACTORY" 'guardian()(address)')"
note "treasury" "$(cast call --rpc-url "$RPC" "$FACTORY" 'treasury()(address)')"

echo
echo "enabled tickers (must be non-zero to be openable, and a Pons pair asset)"
for pair in \
  "NVDA 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC" \
  "AAPL 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9" \
  "TSLA 0x322F0929c4625eD5bAd873c95208D54E1c003b2d" \
  "AMZN 0x12f190a9F9d7D37a250758b26824B97CE941bF54"
do
  sym=${pair%% *}; addr=${pair##* }
  seed=$(cast call --rpc-url "$RPC" "$FACTORY" 'minSeed(address)(uint256)' "$addr" | awk '{print $1}')
  grad=$(cast call --rpc-url "$RPC" "$PONS" 'pairTokenEconomics(address)(uint256,uint256,uint8)' "$addr" 2>/dev/null | sed -n 2p | awk '{print $1}')
  if [ "${seed:-0}" != "0" ] && [ "${grad:-0}" != "0" ]; then
    printf "  ok    %-34s minSeed %s, graduates at %s\n" "$sym" "$seed" "$grad"; pass=$((pass+1))
  else
    printf "  FAIL  %-34s minSeed %s, pons threshold %s\n" "$sym" "${seed:-0}" "${grad:-0}"; fail=$((fail+1))
  fi
done

echo
echo "clubs"
note "clubs created so far" "$(cast call --rpc-url "$RPC" "$FACTORY" 'allClubsLength()(uint256)')"

echo
if [ "$fail" -eq 0 ]; then echo "$pass checks passed, nothing failed."; else echo "$fail CHECK(S) FAILED, $pass passed."; exit 1; fi
