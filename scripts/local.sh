#!/usr/bin/env bash
# Bring up the whole stack locally: chain, contracts, seeded clubs, frontend env.
#
# Note on why the Pons pieces are mocked here: anvil cannot fork Robinhood Chain, because
# Orbit block headers carry no excessBlobGas and anvil's Cancun block env requires it. The
# real Pons integration is covered by test/ForkIntegration.t.sol, which runs against live
# mainnet state. This script is for exercising the frontend against real ClubFactory and
# ClubVault contracts on a chain you can write to.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"

RPC=http://127.0.0.1:8545
MULTICALL3=0xcA11bde05977b3631167028862bE2a173976CA11
MAINNET_RPC=https://rpc.mainnet.chain.robinhood.com

echo "==> starting anvil on chain id 4663"
pkill -f "anvil --chain-id 4663" 2>/dev/null || true
sleep 1
anvil --chain-id 4663 --port 8545 --accounts 5 --balance 1000 --block-time 2 > /tmp/pyro-anvil.log 2>&1 &
for _ in $(seq 1 20); do cast chain-id --rpc-url $RPC >/dev/null 2>&1 && break; sleep 1; done

# wagmi batches every list read through Multicall3. It IS deployed on real Robinhood Chain
# (3808 bytes at the canonical address) but a fresh anvil has nothing there, and the batched
# reads then fail silently and the UI shows zero clubs. Copy the real bytecode across.
echo "==> installing Multicall3 from mainnet bytecode"
CODE=$(cast code --rpc-url $MAINNET_RPC $MULTICALL3)
cast rpc --rpc-url $RPC anvil_setCode $MULTICALL3 "$CODE" > /dev/null

echo "==> deploying contracts and seeding clubs"
OUT=$(forge script script/LocalStack.s.sol --rpc-url $RPC --broadcast 2>&1)
echo "$OUT" | grep -E "^  (NVDA|FACTORY|club|deployer)" || { echo "$OUT" | tail -20; exit 1; }

FACTORY=$(echo "$OUT" | grep "^  FACTORY" | awk '{print $2}')
NVDA=$(echo "$OUT" | grep "^  NVDA" | awk '{print $2}')

cat > web/.env.local <<ENV
NEXT_PUBLIC_CLUB_FACTORY=$FACTORY
NEXT_PUBLIC_RPC_URL=$RPC
NEXT_PUBLIC_STOCKS=[{"symbol":"NVDA","name":"NVIDIA","address":"$NVDA","graduation":"41.6","phantom":"16.64"}]
ENV
echo "==> wrote web/.env.local"
echo
echo "Next:"
echo "  cd web && npm run dev"
echo "  import an anvil key into your wallet, add network chain id 4663 at $RPC"
echo
echo "  keeper:"
echo "  cd keeper && CLUB_FACTORY=$FACTORY RPC_URL=$RPC \\"
echo "    KEEPER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d npm run once"
