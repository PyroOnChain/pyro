/**
 * Pyro keeper.
 *
 * Nothing calls harvest() on its own. Robinhood Chain has no Chainlink Automation and no
 * Gelato, and the Pons escrow's claim functions are msg.sender-scoped, so a third party
 * cannot claim on a vault's behalf. The vault has to call the escrow itself, which is why
 * ClubVault exposes a permissionless harvest() that pays the caller a bounty.
 *
 * This process is that caller. Once clubs have real volume the bounty makes it worth a
 * stranger's while and this becomes redundant, which is the intent.
 */
import {
  createPublicClient, createWalletClient, http, defineChain,
  formatUnits, parseUnits, type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { factoryAbi, vaultAbi } from './abis.js';

const RPC = process.env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
const FACTORY = process.env.CLUB_FACTORY as Address | undefined;
const PK = process.env.KEEPER_PRIVATE_KEY as `0x${string}` | undefined;
const POLL_MS = Number(process.env.POLL_SECONDS || 300) * 1000;
const MIN_CLAIMABLE = parseUnits(process.env.MIN_CLAIMABLE || '0.05', 18);
const ONCE = process.argv.includes('--once');

if (!FACTORY) throw new Error('CLUB_FACTORY is required');
if (!PK) throw new Error('KEEPER_PRIVATE_KEY is required');

const chain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
});

const account = privateKeyToAccount(PK);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ account, chain, transport: http(RPC) });

const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);

async function listClubs(): Promise<Address[]> {
  const n = await pub.readContract({ address: FACTORY!, abi: factoryAbi, functionName: 'allClubsLength' });
  if (n === 0n) return [];
  const res = await pub.multicall({
    contracts: Array.from({ length: Number(n) }, (_, i) => ({
      address: FACTORY!, abi: factoryAbi, functionName: 'allClubs', args: [BigInt(i)],
    } as const)),
  });
  return res.flatMap((r) => (r.status === 'success' ? [r.result as Address] : []));
}

async function claimable(clubs: Address[]) {
  const res = await pub.multicall({
    contracts: clubs.flatMap((address) => ([
      { address, abi: vaultAbi, functionName: 'pendingFees' } as const,
      { address, abi: vaultAbi, functionName: 'name' } as const,
    ])),
  });
  return clubs.map((address, i) => ({
    address,
    pending: res[i * 2]?.status === 'success' ? (res[i * 2].result as bigint) : 0n,
    name: res[i * 2 + 1]?.status === 'success' ? (res[i * 2 + 1].result as string) : address,
  }));
}

async function harvest(club: { address: Address; name: string; pending: bigint }) {
  // Simulate first. A club whose fees were claimed a block ago reverts NothingToHarvest, and
  // there is no reason to pay gas to discover that.
  try {
    const { request } = await pub.simulateContract({
      address: club.address, abi: vaultAbi, functionName: 'harvest', account,
    });
    const hash = await wallet.writeContract(request);
    log(`  harvesting ${club.name} (${formatUnits(club.pending, 18)}) tx ${hash}`);
    const rc = await pub.waitForTransactionReceipt({ hash, timeout: 120_000 });
    log(`  ${rc.status === 'success' ? 'ok' : 'REVERTED'} in block ${rc.blockNumber}, gas ${rc.gasUsed}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message.split('\n')[0] : String(e);
    if (msg.includes('NothingToHarvest')) log(`  ${club.name}: nothing to claim, skipping`);
    else log(`  ${club.name}: simulation failed, skipping. ${msg.slice(0, 140)}`);
  }
}

async function tick() {
  const clubs = await listClubs();
  if (clubs.length === 0) { log('no clubs yet'); return; }

  const rows = await claimable(clubs);
  const ripe = rows.filter((r) => r.pending >= MIN_CLAIMABLE);
  log(`${clubs.length} club(s), ${ripe.length} above the ${formatUnits(MIN_CLAIMABLE, 18)} threshold`);

  for (const club of ripe) await harvest(club);
}

async function main() {
  const bal = await pub.getBalance({ address: account.address });
  log(`keeper ${account.address}, ${formatUnits(bal, 18)} ETH, factory ${FACTORY}`);
  if (bal === 0n) log('WARNING: keeper has no ETH, every harvest will fail');

  await tick();
  if (ONCE) return;

  log(`polling every ${POLL_MS / 1000}s`);
  for (;;) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    try { await tick(); } catch (e) { log('tick failed:', e instanceof Error ? e.message : e); }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
