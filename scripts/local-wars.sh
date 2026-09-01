#!/usr/bin/env bash
# Bring the Stock Wars arena up locally: chain, contracts, seeded fights, frontend env.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
RPC=http://127.0.0.1:8545
MULTICALL3=0xcA11bde05977b3631167028862bE2a173976CA11
MAINNET_RPC=https://rpc.mainnet.chain.robinhood.com

echo "==> anvil on chain id 4663"
pkill -f "anvil --chain-id 4663" 2>/dev/null || true
sleep 1
anvil --chain-id 4663 --port 8545 --accounts 5 --balance 1000 --block-time 2 > /tmp/wars-anvil.log 2>&1 &
for _ in $(seq 1 20); do cast chain-id --rpc-url $RPC >/dev/null 2>&1 && break; sleep 1; done

# wagmi batches list reads through Multicall3; a fresh anvil has nothing there and
# the batched reads fail silently, showing an empty arena.
CODE=$(cast code --rpc-url $MAINNET_RPC $MULTICALL3)
cast rpc --rpc-url $RPC anvil_setCode $MULTICALL3 "$CODE" > /dev/null

OUT=$(forge script script/LocalStockWars.s.sol --rpc-url $RPC --broadcast 2>&1)
echo "$OUT" | grep -E "^  (NVDA|FACTORY|live|close|deployer)" || { echo "$OUT" | tail -25; exit 1; }
FACTORY=$(echo "$OUT" | grep "^  FACTORY" | awk '{print $2}')

cat > wars/.env.local <<ENV
NEXT_PUBLIC_BATTLE_FACTORY=$FACTORY
NEXT_PUBLIC_RPC_URL=$RPC
ENV
echo "==> wrote wars/.env.local"
