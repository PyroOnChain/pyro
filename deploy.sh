#!/usr/bin/env bash
# Pyro: one-command mainnet deploy.
# Asks a few questions, does the rest, and checks its own work.
set -uo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.foundry/bin:$PATH"

B=$'\033[1m'; D=$'\033[2m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'
say()  { printf "\n${B}%s${N}\n" "$1"; }
info() { printf "  %s\n" "$1"; }
ok()   { printf "  ${G}done${N}  %s\n" "$1"; }
warn() { printf "  ${Y}note${N}  %s\n" "$1"; }
die()  { printf "\n  ${R}stopped${N}  %s\n\n" "$1"; exit 1; }
ask()  { local p="$1" d="${2:-}" a; if [ -n "$d" ]; then read -r -p "  $p [$d]: " a; echo "${a:-$d}"; else read -r -p "  $p: " a; echo "$a"; fi; }

RPC=https://rpc.mainnet.chain.robinhood.com
PONS=0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e

printf "\n${B}Pyro deploy${N}\n${D}  Puts your contracts on Robinhood Chain and points the website at them.${N}\n"

# ---------------------------------------------------------------- 1. tools
say "1. Checking tools"
if ! command -v forge >/dev/null 2>&1; then
  info "Foundry is missing. Installing it now (this is the tool that deploys contracts)."
  curl -L https://foundry.paradigm.xyz | bash >/dev/null 2>&1
  "$HOME/.foundry/bin/foundryup" >/dev/null 2>&1
  command -v forge >/dev/null 2>&1 || die "Foundry would not install. Send me the output of: curl -L https://foundry.paradigm.xyz | bash"
fi
ok "Foundry ready"
cast chain-id --rpc-url $RPC >/dev/null 2>&1 || die "Cannot reach Robinhood Chain. Check your internet and try again."
ok "Connected to Robinhood Chain"

# ---------------------------------------------------------------- 2. wallet
say "2. Your deploying wallet"
info "This wallet pays the gas and becomes the owner of Pyro."
info "${D}Nothing is sent anywhere. The key stays encrypted on this Mac.${N}"
echo
if cast wallet address --account pyro-deployer >/dev/null 2>&1; then
  SENDER=$(cast wallet address --account pyro-deployer)
  ok "Found a saved wallet: $SENDER"
else
  info "Paste your wallet's private key when asked, then pick a password to encrypt it."
  info "In MetaMask: three dots > Account details > Show private key."
  echo
  cast wallet import pyro-deployer --interactive || die "Wallet import failed. Run this script again."
  SENDER=$(cast wallet address --account pyro-deployer) || die "Could not read the wallet back."
  ok "Wallet saved as 'pyro-deployer': $SENDER"
fi

# ---------------------------------------------------------------- 3. gas
say "3. Checking you have enough ETH"
BAL=$(cast balance --rpc-url $RPC "$SENDER" 2>/dev/null || echo 0)
BAL_ETH=$(cast to-unit "$BAL" ether 2>/dev/null || echo 0)
info "Balance: $BAL_ETH ETH"
if [ "$(echo "$BAL_ETH < 0.02" | bc -l 2>/dev/null || echo 1)" = "1" ]; then
  warn "You need about 0.05 ETH on Robinhood Chain to deploy."
  info "Bridge ETH to Robinhood Chain, then run this script again."
  info "Bridge: https://robinhood.com/chain  (or Across / Relay / LayerZero)"
  info "Send it to: $SENDER"
  die "Not enough ETH yet. Nothing has been deployed, so this is safe to rerun."
fi
ok "Enough ETH to deploy"

# ---------------------------------------------------------------- 4. roles
say "4. Who controls Pyro"
info "Three roles. For now they can all be your wallet."
info "${D}owner    changes settings.  guardian  emergency powers.  treasury  receives fees (currently 0%).${N}"
warn "Before real money is in the jars these should become a multisig (a shared wallet)."
echo
OWNER=$(ask   "owner    address" "$SENDER")
GUARDIAN=$(ask "guardian address" "$SENDER")
TREASURY=$(ask "treasury address" "$SENDER")
for a in "$OWNER" "$GUARDIAN" "$TREASURY"; do
  [[ "$a" =~ ^0x[a-fA-F0-9]{40}$ ]] || die "'$a' is not a valid wallet address. Run again."
done
ok "Roles set"

# ---------------------------------------------------------------- 5. deploy
say "5. Deploying"
info "This spends real ETH. Ctrl-C in the next 5 seconds to stop."
sleep 5
export OWNER GUARDIAN TREASURY
OUT=$(forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC" --broadcast \
        --account pyro-deployer --sender "$SENDER" 2>&1)
FACTORY=$(echo "$OUT" | grep -oE 'ClubFactory: 0x[a-fA-F0-9]{40}' | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
if [ -z "$FACTORY" ]; then
  echo "$OUT" | tail -25
  die "The deploy did not finish. Send me the lines above."
fi
ok "Deployed at $FACTORY"

# ---------------------------------------------------------------- 6. verify
say "6. Checking the deploy is correct"
if ./scripts/verify-deploy.sh "$FACTORY"; then ok "All checks passed"
else die "Something is wrong with the deploy. Send me the output above. Do not use it yet."; fi

# ---------------------------------------------------------------- 7. website
say "7. Pointing the website at your contracts"
RPC_URL=$(ask "Alchemy URL (press enter to use the free public one for now)" "$RPC")
cat > web/.env.local <<ENV
NEXT_PUBLIC_CLUB_FACTORY=$FACTORY
NEXT_PUBLIC_RPC_URL=$RPC_URL
ENV
ok "Wrote web/.env.local"

# ---------------------------------------------------------------- 8. keeper
say "8. Creating the harvest robot's wallet"
info "A separate throwaway wallet that only holds gas money."
if [ -f keeper/.env ]; then
  ok "Already exists, leaving it alone"
  KEEPER_ADDR=$(python3 - <<'PYEOF'
import os, re, subprocess
env = {'PATH': os.path.expanduser('~/.foundry/bin') + ':/usr/bin:/bin'}
key = next((l.split('=',1)[1].strip() for l in open('keeper/.env')
            if l.startswith('KEEPER_PRIVATE_KEY=')), '')
if len(key) == 66:
    out = subprocess.run(['cast','wallet','address','--private-key',key],
                         capture_output=True, text=True, env=env).stdout
    print(re.sub(r'\x1b\[[0-9;]*m', '', out).strip())
PYEOF
)
else
  # The private key is written straight to the file and never echoed. Printing it would
  # put it in terminal scrollback, where it is one careless copy-paste from being stolen.
  KEEPER_ADDR=$(FACTORY="$FACTORY" RPC_URL="$RPC_URL" python3 - <<'PYEOF'
import subprocess, json, os, re
env = {'PATH': os.path.expanduser('~/.foundry/bin') + ':/usr/bin:/bin'}

def find_wallet(node):
    if isinstance(node, dict):
        keys = {k.lower(): k for k in node}
        addr = next((node[keys[k]] for k in keys if 'address' in k), None)
        priv = next((node[keys[k]] for k in keys if 'private' in k), None)
        if isinstance(addr, str) and isinstance(priv, str):
            return addr, priv
        for v in node.values():
            got = find_wallet(v)
            if got: return got
    elif isinstance(node, list):
        for v in node:
            got = find_wallet(v)
            if got: return got
    return None

raw = subprocess.run(['cast','wallet','new','--json'], capture_output=True, text=True, env=env).stdout
addr = priv = None
try:
    got = find_wallet(json.loads(raw))
    if got: addr, priv = got
except Exception:
    pass
if not (addr and priv):
    clean = re.sub(r'\x1b\[[0-9;]*m', '', subprocess.run(
        ['cast','wallet','new'], capture_output=True, text=True, env=env).stdout)
    addr = re.search(r'0x[a-fA-F0-9]{40}', clean).group(0)
    priv = re.search(r'0x[a-fA-F0-9]{64}', clean).group(0)

assert len(addr) == 42 and len(priv) == 66, 'could not generate a keeper wallet'
open('keeper/.env','w').write(
    f"CLUB_FACTORY={os.environ['FACTORY']}\n"
    f"KEEPER_PRIVATE_KEY={priv}\n"
    f"RPC_URL={os.environ['RPC_URL']}\n"
    "POLL_SECONDS=300\nMIN_CLAIMABLE=0.05\n")
os.chmod('keeper/.env', 0o600)
print(addr)
PYEOF
)
  [ -n "$KEEPER_ADDR" ] || die "Could not create the keeper wallet."
  ok "Created keeper wallet $KEEPER_ADDR"
  warn "Its private key is in keeper/.env and was deliberately not printed. Never paste that file anywhere."
  warn "Send this wallet about 0.02 ETH so it can pay for harvests."
fi

# ---------------------------------------------------------------- done
cat <<DONE

${B}Deployed.${N}

  Pyro contracts   $FACTORY
  Explorer         https://robinhoodchain.blockscout.com/address/$FACTORY
  Harvest robot    $KEEPER_ADDR   ${D}(send it ~0.02 ETH)${N}

${B}What is left, in order${N}

  1  See it running locally:      ${D}cd web && npm run dev${N}   then open http://localhost:3000
  2  Open one test club through the website, with the smallest amount, and check it works
  3  Put the website online:      vercel.com > Add New > Project > import your pyro repo
                                  root directory ${D}web${N}, then paste the two lines from
                                  web/.env.local into its Environment Variables
  4  Start the harvest robot:     ${D}cd keeper && npm start${N}   (leave it running)
  5  Send the repo to your auditor

DONE
