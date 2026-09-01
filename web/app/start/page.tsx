'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { maxUint256, parseEther, parseUnits, type Address } from 'viem';
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { erc20Abi, factoryAbi } from '@/lib/abi';
import { BATTLE_FACTORY, STOCKS, factoryDeployed } from '@/lib/addresses';
import { fmt } from '@/lib/format';
import { explorerTx } from '@/lib/chain';
import { useCorrectChain } from '@/lib/useCorrectChain';

/**
 * Two Pons launches, so two launch fees. The factory forwards exactly what Pons
 * charges and refunds the rest, so a little headroom here costs nothing.
 */
const LAUNCH_VALUE = parseEther('0.0012');
const EMPTY_SOCIALS = { twitter: '', telegram: '', discord: '', website: '', farcaster: '' } as const;
const ZERO32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

function randomSalt(): `0x${string}` {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return `0x${Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

export default function StartPage() {
  const router = useRouter();
  const { address: me } = useAccount();
  const { wrongChain, switching, switchToVaultTube: switchChain } = useCorrectChain();

  const [stock, setStock] = useState<Address>(STOCKS[0].address);
  const [aName, setAName] = useState('');
  const [aSym, setASym] = useState('');
  const [bName, setBName] = useState('');
  const [bSym, setBSym] = useState('');
  const [seed, setSeed] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  // Kept as two calls: one array mixing both ABIs with conditional spreads defeats
  // wagmi's return-type inference and every result comes back typed `never`.
  const { data: cfg } = useReadContracts({
    contracts: [
      { address: BATTLE_FACTORY as Address, abi: factoryAbi, functionName: 'minSeed', args: [stock] },
      { address: BATTLE_FACTORY as Address, abi: factoryAbi, functionName: 'duration' },
      { address: BATTLE_FACTORY as Address, abi: factoryAbi, functionName: 'paused' },
    ],
    query: { enabled: Boolean(BATTLE_FACTORY) },
  });

  const { data: wallet } = useReadContracts({
    contracts: [
      { address: stock, abi: erc20Abi, functionName: 'balanceOf', args: [me as Address] },
      { address: stock, abi: erc20Abi, functionName: 'allowance', args: [me as Address, BATTLE_FACTORY as Address] },
    ],
    query: { enabled: Boolean(BATTLE_FACTORY && me) },
  });

  const c = (i: number) => (cfg?.[i]?.status === 'success' ? cfg[i].result : undefined);
  const w = (i: number) => (wallet?.[i]?.status === 'success' ? wallet[i].result : undefined);
  const minSeed = c(0) as bigint | undefined;
  const duration = c(1) as bigint | undefined;
  const paused = c(2) as boolean | undefined;
  const balance = w(0) as bigint | undefined;
  const allowance = w(1) as bigint | undefined;

  const stockMeta = STOCKS.find((s) => s.address === stock)!;
  const parsedSeed = useMemo(() => {
    try { return seed ? parseUnits(seed, 18) : 0n; } catch { return 0n; }
  }, [seed]);

  const total = parsedSeed * 2n;
  const belowMin = minSeed !== undefined && parsedSeed < minSeed;
  const notEnough = balance !== undefined && total > balance;
  const ready = aName.trim() && aSym.trim() && bName.trim() && bSym.trim() && parsedSeed > 0n && !belowMin && !notEnough && !paused;

  async function start() {
    if (!BATTLE_FACTORY || !ready) return;
    setErr(null);
    try {
      if ((allowance ?? 0n) < total) {
        await writeContractAsync({ address: stock, abi: erc20Abi, functionName: 'approve', args: [BATTLE_FACTORY, maxUint256] });
      }
      const mk = (name: string, symbol: string) => ({
        name: name.trim(), symbol: symbol.trim().toUpperCase(), logo: '', description: '',
        socials: EMPTY_SOCIALS, creatorFeeRecipient: '0x0000000000000000000000000000000000000000' as Address,
        creatorTaxBps: 1000, buybackEnabled: true, expectedEconomics: ZERO32, salt: randomSalt(),
      });
      await writeContractAsync({
        address: BATTLE_FACTORY, abi: factoryAbi, functionName: 'startBattle',
        args: [stock, mk(aName, aSym), mk(bName, bSym), 0n, parsedSeed, 0n],
        value: LAUNCH_VALUE,
      });
      router.push('/battles');
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(/User rejected|denied transaction/i.test(m) ? 'You rejected the transaction.' : m.split('\n')[0].slice(0, 180));
    }
  }

  if (!factoryDeployed()) {
    return (
      <>
        <Header />
        <div className="shell" style={{ padding: '90px 36px', textAlign: 'center' }}>
          <div className="display h-2" style={{ marginBottom: 12 }}>NOT LIVE YET</div>
          <p style={{ color: 'var(--muted)' }}>The arena has not been deployed to this network.</p>
        </div>
        <Footer />
      </>
    );
  }

  const busy = isPending || receipt.isLoading;

  return (
    <>
      <Header />
      <div className="shell" style={{ padding: '40px 36px 60px' }}>
        <h1 className="display h-2" style={{ margin: '0 0 8px' }}>START A FIGHT</h1>
        <p style={{ fontSize: 15.5, color: 'var(--muted)', margin: '0 0 30px', maxWidth: 660 }}>
          Two coins, launched in the same transaction, priced in the same stock. You seed both corners
          equally so neither opens empty, and those seed positions stay yours.
        </p>

        {paused && (
          <div className="panel plate" style={{ padding: '16px 20px', marginBottom: 22, borderColor: 'var(--gold)', color: 'var(--gold)' }}>
            New fights are paused right now.
          </div>
        )}

        <div className="grid-2" style={{ gap: 22, alignItems: 'start' }}>
          <div className="stack" style={{ gap: 18 }}>
            <div className="panel plate" style={{ padding: '24px 24px' }}>
              <div className="label" style={{ marginBottom: 14 }}>01 · WHAT THEY FIGHT IN</div>
              <div className="grid-4" style={{ gap: 10 }}>
                {STOCKS.map((s) => (
                  <button key={s.address} onClick={() => setStock(s.address)}
                    className="chip" style={{
                      justifyContent: 'center', padding: '14px 8px', flexDirection: 'column', gap: 3,
                      borderColor: s.address === stock ? 'var(--gold)' : 'var(--line)',
                      color: s.address === stock ? 'var(--gold)' : 'var(--muted)',
                    }}>
                    <span className="display" style={{ fontSize: 16 }}>{s.symbol}</span>
                    <span style={{ fontSize: 10 }}>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel plate" style={{ padding: '24px 24px' }}>
              <div className="label" style={{ marginBottom: 16 }}>02 · THE TWO CORNERS</div>

              <div style={{ borderLeft: '3px solid var(--red)', paddingLeft: 14, marginBottom: 18 }}>
                <div className="label" style={{ color: 'var(--red)', marginBottom: 10 }}>SIDE A</div>
                <div className="grid-2" style={{ gap: 10 }}>
                  <input className="field" placeholder="Jensen’s Jacket" value={aName} onChange={(e) => setAName(e.target.value)} maxLength={32} />
                  <input className="field mono" placeholder="JACKET" value={aSym} onChange={(e) => setASym(e.target.value.toUpperCase())} maxLength={10} />
                </div>
              </div>

              <div style={{ borderLeft: '3px solid var(--blue)', paddingLeft: 14 }}>
                <div className="label" style={{ color: 'var(--blue)', marginBottom: 10 }}>SIDE B</div>
                <div className="grid-2" style={{ gap: 10 }}>
                  <input className="field" placeholder="Cook’s Turtleneck" value={bName} onChange={(e) => setBName(e.target.value)} maxLength={32} />
                  <input className="field mono" placeholder="NECK" value={bSym} onChange={(e) => setBSym(e.target.value.toUpperCase())} maxLength={10} />
                </div>
              </div>
            </div>

            <div className="panel plate" style={{ padding: '24px 24px' }}>
              <div className="label" style={{ marginBottom: 14 }}>03 · SEED EACH CORNER</div>
              <div className="panel-2" style={{ padding: '14px 16px', marginBottom: 10 }}>
                <div className="row" style={{ gap: 10 }}>
                  <input className="field-amount" inputMode="decimal" placeholder="0.00"
                    value={seed} onChange={(e) => setSeed(e.target.value.replace(/[^0-9.]/g, ''))} />
                  <span className="mono" style={{ fontSize: 14 }}>{stockMeta.symbol}</span>
                </div>
              </div>
              <div className="between mono" style={{ fontSize: 12, color: 'var(--dim)' }}>
                <span>minimum {fmt(minSeed, 18, 4)} each</span>
                <span>you pay {fmt(total, 18, 4)} {stockMeta.symbol} total</span>
              </div>
              {belowMin && parsedSeed > 0n && (
                <div style={{ fontSize: 13, color: 'var(--loss)', marginTop: 10 }}>
                  Below the minimum of {fmt(minSeed, 18, 4)} {stockMeta.symbol} per corner.
                </div>
              )}
              {notEnough && (
                <div style={{ fontSize: 13, color: 'var(--loss)', marginTop: 10 }}>
                  You hold {fmt(balance, 18, 4)} {stockMeta.symbol}, and both corners together need {fmt(total, 18, 4)}.
                </div>
              )}
            </div>
          </div>

          {/* --------------------------------------------------------- summary */}
          <div className="panel plate" style={{ padding: '24px 24px', position: 'sticky', top: 90 }}>
            <div className="label" style={{ marginBottom: 18 }}>WHAT GETS DEPLOYED</div>
            <Row k="Coins launched" v="2, same block" />
            <Row k="Priced in" v={stockMeta.symbol} />
            <Row k="Creator tax" v="10% (the Pons max)" />
            <Row k="Fees point at" v="the arena" gold />
            <Row k="Fight lasts" v={duration ? `${Number(duration) / 60} minutes` : '—'} />
            <div style={{ borderTop: '1px solid var(--line)', margin: '14px 0' }} />
            <Row k="Pons launch fees" v="0.001 ETH" />
            <Row k="Seed, both corners" v={`${fmt(total, 18, 4)} ${stockMeta.symbol}`} />
            <Row k="Transactions" v={(allowance ?? 0n) < total ? '2 (approve, then start)' : '1'} />

            <div style={{ marginTop: 20 }}>
              {wrongChain ? (
                <button className="btn btn-gold" style={{ width: '100%' }} disabled={switching} onClick={switchChain}>
                  {switching ? 'Check your wallet…' : 'Switch network'}
                </button>
              ) : (
                <button className="btn btn-gold" style={{ width: '100%' }} disabled={busy || !ready} onClick={start}>
                  {busy ? 'Confirm in wallet…' : !ready ? 'Fill in both corners' : 'Ring the bell'}
                </button>
              )}
            </div>

            {err && <div style={{ fontSize: 13, color: 'var(--loss)', marginTop: 12 }}>{err}</div>}
            {hash && (
              <div style={{ fontSize: 12.5, marginTop: 10 }}>
                <a href={explorerTx(hash)} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
                  {receipt.isLoading ? 'Confirming…' : 'View transaction'}
                </a>
              </div>
            )}

            <p style={{ fontSize: 12.5, color: 'var(--dim)', margin: '16px 0 0', lineHeight: 1.6 }}>
              Both coins carry Pons’s snipe tax for the first few seconds, starting at 99% and decaying. It applies
              to both corners equally and exists to stop bots buying the launch out from under everyone.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function Row({ k, v, gold }: { k: string; v: string; gold?: boolean }) {
  return (
    <div className="between" style={{ padding: '6px 0', fontSize: 13.5 }}>
      <span style={{ color: 'var(--muted)' }}>{k}</span>
      <span className="mono" style={{ color: gold ? 'var(--gold)' : 'var(--ink)' }}>{v}</span>
    </div>
  );
}
