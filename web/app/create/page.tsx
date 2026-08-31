'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseUnits, parseEther, maxUint256, toHex, type Address } from 'viem';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { Header } from '@/components/Header';
import { NotDeployed } from '@/components/NotDeployed';
import { STOCKS, CLUB_FACTORY } from '@/lib/addresses';
import { clubfactoryAbi, stockTokenAbi } from '@/lib/abis';
import { factoryDeployed } from '@/lib/clubs';
import { fmt, STOCK_DECIMALS } from '@/lib/format';
import { explorerTx } from '@/lib/chain';
import { useCorrectChain } from '@/lib/useCorrectChain';
import { ImagePicker } from '@/components/ImagePicker';

const PONS_LAUNCH_FEE = parseEther('0.0005'); // launchFee() on the Pons factory, verified

export default function CreatePage() {
  const router = useRouter();
  const { address } = useAccount();
  const { wrongChain, switching, switchToPyro } = useCorrectChain();
  const [stock, setStock] = useState(STOCKS[0]);
  const [mascotName, setMascotName] = useState('');
  const [mascotSymbol, setMascotSymbol] = useState('');
  const [blurb, setBlurb] = useState('');
  const [logo, setLogo] = useState('');
  const [twitter, setTwitter] = useState('');
  const [website, setWebsite] = useState('');
  const [creatorTaxBps, setCreatorTaxBps] = useState(1000);
  const [creatorFeeBps, setCreatorFeeBps] = useState(500);
  const [seed, setSeed] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { writeContractAsync, data: hash } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const minSeed = useReadContract({
    address: CLUB_FACTORY as Address, abi: clubfactoryAbi, functionName: 'minSeed',
    args: [stock.address], query: { enabled: factoryDeployed() },
  });

  const balance = useReadContract({
    address: stock.address, abi: stockTokenAbi, functionName: 'balanceOf',
    args: address ? [address] : undefined, query: { enabled: Boolean(address) },
  });

  if (!factoryDeployed()) return (<><Header /><NotDeployed /></>);

  let seedWei = 0n;
  try { seedWei = seed ? parseUnits(seed, STOCK_DECIMALS) : 0n; } catch { seedWei = 0n; }
  const min = (minSeed.data as bigint | undefined) ?? 0n;
  const belowMin = min > 0n && seedWei < min;
  // The launchpad reverts MetadataTooLong past 512 characters, measured against
  // the live contract, so a link has to be short as well as valid.
  const logoOk = /^(https?|ipfs):\/\/\S+$/i.test(logo.trim()) && logo.trim().length <= 480;
  const ready =
    Boolean(address) && mascotName.trim() && mascotSymbol.trim() &&
    logoOk && seedWei > 0n && !belowMin && !busy;

  async function submit() {
    if (!address) return;
    setErr(null);
    try {
      setBusy('Approving the seed deposit');
      await writeContractAsync({
        address: stock.address, abi: stockTokenAbi, functionName: 'approve',
        args: [CLUB_FACTORY as Address, maxUint256],
      });

      setBusy('Opening the club');
      const salt = toHex(crypto.getRandomValues(new Uint8Array(32)));
      await writeContractAsync({
        address: CLUB_FACTORY as Address,
        abi: clubfactoryAbi,
        functionName: 'createClub',
        value: PONS_LAUNCH_FEE,
        args: [
          stock.address,
          seedWei,
          `${stock.symbol} Club`,
          `c${stock.symbol}`,
          creatorFeeBps,
          {
            name: mascotName,
            symbol: mascotSymbol.replace(/^\$/, ''),
            logo: logo.trim(),
            description: blurb,
            socials: {
              twitter: twitter.trim(),
              telegram: '',
              discord: '',
              website: website.trim(),
              farcaster: '',
            },
            creatorFeeRecipient: '0x0000000000000000000000000000000000000000' as Address, // factory overwrites with the vault
            creatorTaxBps,
            buybackEnabled: true,
            expectedEconomics: '0x0000000000000000000000000000000000000000000000000000000000000000',
            salt,
          },
          0n, // launchConfigId
        ],
      });
      router.push('/clubs');
    } catch (e) {
      setErr(e instanceof Error ? e.message.split('\n')[0].slice(0, 200) : 'Failed to open the club');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Header />
      <div className="shell" style={{ padding: '34px 40px 60px' }}>
        <h1 className="display h-2" style={{ margin: '0 0 8px' }}>OPEN A CLUB</h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', margin: '0 0 30px' }}>
          One transaction builds the vault, launches the mascot on Pons, and points its creator fees at the vault.
          There is no step two.
        </p>

        <div className="grid-12" style={{ gap: 24 }}>
          <div className="col-7" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Step n="01" title="PICK THE STOCK">
              <div className="grid-4" style={{ gap: 11 }}>
                {STOCKS.map((s) => {
                  const on = s.symbol === stock.symbol;
                  return (
                    <button key={s.symbol} onClick={() => setStock(s)} className="chip"
                      style={{ textAlign: 'left', padding: '15px 14px', background: on ? '#FFF7F3' : 'var(--card)',
                        border: on ? '2px solid var(--ember)' : '1px solid var(--line)' }}>
                      <div className="display" style={{ fontSize: 17, marginBottom: 4 }}>{s.symbol}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>grad {s.graduation}</div>
                    </button>
                  );
                })}
              </div>
            </Step>

            <Step n="02" title="NAME THE MASCOT">
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
                <Labeled label="MASCOT NAME">
                  <input className="field chip" value={mascotName} onChange={(e) => setMascotName(e.target.value)}
                    placeholder="Jensen's Leather Jacket" maxLength={64} />
                </Labeled>
                <Labeled label="TICKER">
                  <input className="field chip mono" value={mascotSymbol}
                    onChange={(e) => setMascotSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="GPU" maxLength={10} />
                </Labeled>
              </div>
              <Labeled label="ONE LINE ABOUT IT">
                <input className="field chip" value={blurb} onChange={(e) => setBlurb(e.target.value)}
                  placeholder="The jacket that launched a trillion dollar company." maxLength={140} />
              </Labeled>

              <div style={{ height: 14 }} />
              <Labeled label="MASCOT IMAGE">
                <ImagePicker value={logo} onChange={setLogo} />
              </Labeled>
              <div style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 9, lineHeight: 1.55 }}>
                Required. A mascot with no image is close to invisible on the launchpad, which ranks
                by volume and market cap. Uploads are squared and compressed here in your browser,
                then stored with the launch, so nothing needs hosting.
              </div>

              <div style={{ height: 14 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Labeled label="X / TWITTER (OPTIONAL)">
                  <input className="field chip" value={twitter} onChange={(e) => setTwitter(e.target.value)}
                    placeholder="https://x.com/..." />
                </Labeled>
                <Labeled label="WEBSITE (OPTIONAL)">
                  <input className="field chip" value={website} onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..." />
                </Labeled>
              </div>
            </Step>

            <Step n="03" title="SET THE SPLIT">
              <Slider label={`Creator tax on every $${mascotSymbol || 'MASCOT'} trade`}
                value={creatorTaxBps} max={1000} onChange={setCreatorTaxBps} note="Pons caps this at 10%" />
              <div style={{ height: 24 }} />
              <Slider label="Your cut of each harvest"
                value={creatorFeeBps} max={2000} onChange={setCreatorFeeBps} note="the rest goes to the jar" />
            </Step>

            <Step n="04" title="SEED THE JAR">
              <div className="chip between" style={{ border: '1px solid var(--stroke)', background: 'var(--bg)', padding: '15px 16px' }}>
                <input className="field-amount" inputMode="decimal" placeholder="0.00" value={seed}
                  onChange={(e) => setSeed(e.target.value.replace(/[^0-9.]/g, ''))} />
                <span className="display" style={{ fontSize: 15 }}>{stock.symbol}</span>
              </div>
              <div style={{ fontSize: 12.5, color: belowMin ? 'var(--loss)' : 'var(--dim)', marginTop: 11, lineHeight: 1.55 }}>
                {belowMin
                  ? `Minimum is ${fmt(min, STOCK_DECIMALS, 2)} ${stock.symbol}.`
                  : `Minimum is ${fmt(min, STOCK_DECIMALS, 2)} ${stock.symbol}. You get the first shares, and the club opens with something in it instead of an empty page.`}
                {balance.data !== undefined && ` You hold ${fmt(balance.data as bigint, STOCK_DECIMALS, 2)}.`}
              </div>
            </Step>
          </div>

          <div className="col-5">
            <div className="slab card" style={{ padding: '26px 28px', marginBottom: 18 }}>
              <div className="label" style={{ marginBottom: 20 }}>WHAT GETS DEPLOYED</div>
              <div className="stack" style={{ gap: 15, fontSize: 14 }}>
                <Row k="Vault" v={`ERC-4626, ${stock.symbol}`} />
                <Row k="Share token" v={`c${stock.symbol}, transferable`} />
                <Row k="Mascot" v={`$${mascotSymbol || '—'}, paired to ${stock.symbol}`} />
                <Row
                  k="Image"
                  v={logoOk ? 'set' : 'missing'}
                  green={logoOk}
                />
                <Row k="Fee recipient" v="the vault" green />
                <div style={{ height: 1, background: 'var(--line-soft)' }} />
                <Row k="Pons launch fee" v="0.0005 ETH" />
                <Row k="Seed deposit" v={`${seed || '0'} ${stock.symbol}`} />
                <Row k="Pyro fee" v="0.00" />
              </div>
              {wrongChain ? (
                <button className="btn btn-primary" style={{ width: '100%', padding: 16, marginTop: 24, textAlign: 'center' }}
                  disabled={switching} onClick={switchToPyro}>
                  {switching ? 'CHECK YOUR WALLET…' : 'SWITCH TO ROBINHOOD CHAIN'}
                </button>
              ) : (
                <button className="btn btn-primary" style={{ width: '100%', padding: 16, marginTop: 24, textAlign: 'center' }}
                  disabled={!ready} onClick={submit}>
                  {busy ? busy.toUpperCase() + '…' : !logoOk ? 'ADD AN IMAGE FIRST' : 'LIGHT IT UP'}
                </button>
              )}
              {wrongChain && (
                <div style={{ fontSize: 12, color: 'var(--loss)', marginTop: 10, lineHeight: 1.5 }}>
                  Your wallet is on another network. Switch before signing anything.
                </div>
              )}
              {err && <div style={{ fontSize: 12, color: 'var(--loss)', marginTop: 10, lineHeight: 1.5 }}>{err}</div>}
              {hash && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
                  {receipt.isLoading ? 'Confirming… ' : 'Confirmed. '}
                  <a href={explorerTx(hash)} target="_blank" rel="noreferrer">View transaction</a>
                </div>
              )}
            </div>

            <div className="slab" style={{ background: 'var(--band)', border: '1px solid var(--line)', padding: '22px 24px' }}>
              <div className="display" style={{ fontSize: 15, letterSpacing: '0.04em', marginBottom: 12 }}>BEFORE YOU SIGN</div>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--body)', margin: '0 0 12px' }}>
                The mascot&apos;s first five seconds carry a snipe tax that starts at 99% and decays to nothing. That is
                Pons, not us, and it exists to stop bots buying your launch out from under you.
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--body)', margin: '0 0 12px' }}>
                Your creator-fee split is fixed at launch and cannot be changed afterwards. Pick it carefully.
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--body)', margin: 0 }}>
                A freshly launched mascot has no volume and no market cap, and the launchpad ranks by
                both, so it will not surface in their explore feed until somebody trades it. Search it
                there by name or ticker rather than by contract address.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="slab card" style={{ padding: '26px 28px' }}>
      <div className="row" style={{ alignItems: 'baseline', gap: 11, marginBottom: 20 }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--ember-ink)' }}>{n}</span>
        <span className="display" style={{ fontSize: 18, letterSpacing: '0.04em' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--dim)', marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  );
}

function Row({ k, v, green }: { k: string; v: string; green?: boolean }) {
  return (
    <div className="between" style={{ alignItems: 'baseline' }}>
      <span style={{ color: 'var(--body)' }}>{k}</span>
      <span className="mono" style={{ fontSize: 13, color: green ? 'var(--gain)' : 'var(--ink)' }}>{v}</span>
    </div>
  );
}

function Slider({ label, value, max, onChange, note }: {
  label: string; value: number; max: number; onChange: (v: number) => void; note: string;
}) {
  return (
    <div>
      <div className="between" style={{ alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 14, color: 'var(--body)' }}>{label}</span>
        <span className="stat" style={{ fontSize: 19 }}>{(value / 100).toFixed(1)}%</span>
      </div>
      <input type="range" min={0} max={max} step={25} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--ember)' }} />
      <div className="between mono" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>
        <span>0%</span><span>{note}</span><span>{(max / 100).toFixed(0)}% max</span>
      </div>
    </div>
  );
}
