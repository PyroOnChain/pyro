import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { STOCKS } from '@/lib/addresses';

const STEPS = [
  {
    n: '01', title: 'DEPOSIT', h: 268, accent: false, foot: null,
    body: 'Put NVDA in, get share tokens back. Own a tenth of the jar and you own a tenth of the shares. Walk out whenever you want.',
  },
  {
    n: '02', title: 'LAUNCH', h: 330, accent: false, foot: 'one club, one mascot',
    body: 'The club fires exactly one mascot on Pons, priced in NVDA. It graduates once 41.6 NVDA has moved through the curve. That is the whole supply schedule.',
  },
  {
    n: '03', title: 'HARVEST', h: 392, accent: true, foot: 'harvest() → jar',
    body: 'Creator fees stack up as NVDA. Anyone can call harvest and keep 0.25% for their trouble. The jar gets fatter, so your slice gets fatter. Nobody sold anything to make that happen.',
  },
];

const HONEST = [
  { t: 'Stock, not hopium.', b: "The jar only ever holds NVDA. The vault never buys the mascot, never holds it, never counts it as an asset. If the mascot rugs at 3am, the jar doesn't move." },
  { t: 'Harvests drip for 24h.', b: "Fees don't land in one block. They release over 24 hours, so depositing a second before a harvest and leaving right after loses money. There's a test named after that exact attack." },
  { t: '0% protocol fee.', b: 'We take nothing today. The contract can never take more than 10% of a harvest, and that ceiling is compiled in, not a governance vote we promise to lose.' },
  { t: 'Exit fees stay in the jar.', b: 'Leave and half a percent of your slice stays behind. It does not come to us. It goes to whoever is still holding.' },
];

export default function LandingPage() {
  return (
    <>
      <Header />

      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 760, height: 620,
          background: 'radial-gradient(ellipse at 20% 30%, rgba(255,90,31,0.13), transparent 68%)', pointerEvents: 'none' }} />
        <div className="shell" style={{ padding: '96px 40px 88px', position: 'relative', zIndex: 2 }}>
          <div className="grid-12">
            <div className="col-7">
              <div className="row" style={{ gap: 10, marginBottom: 30 }}>
                <span style={{ width: 7, height: 7, background: 'var(--ember)', display: 'block' }} />
                <span className="mono" style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--muted)' }}>
                  LIVE ON ROBINHOOD CHAIN
                </span>
              </div>

              <h1 className="display h-hero" style={{ lineHeight: 0.94, letterSpacing: '-0.02em', margin: '0 0 28px' }}>
                YOUR MEME<br />BUYS YOUR<br /><span style={{ color: 'var(--ember-ink)' }}>STOCK.</span>
              </h1>

              <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--body)', margin: '0 0 20px', maxWidth: 620, textWrap: 'pretty' }}>
                Put tokenized NVDA in the jar. Pyro launches one mascot coin for the club, priced in NVDA instead of ETH.
                Every time somebody trades that mascot, the creator fee lands back in the jar as more NVDA.
              </p>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--ink)', margin: '0 0 40px', maxWidth: 620, fontWeight: 500 }}>
                Mascot goes to zero? You still own the stock.
              </p>

              <div className="row" style={{ gap: 14, marginBottom: 36, flexWrap: 'wrap' }}>
                <Link href="/create" className="btn btn-primary" style={{ display: 'inline-block', padding: '18px 34px', fontSize: 16 }}>
                  OPEN A CLUB
                </Link>
                <Link href="/clubs" className="btn btn-ghost" style={{ display: 'inline-block', padding: '17px 30px', fontSize: 16, color: 'var(--ink)' }}>
                  SEE THE CLUBS
                </Link>
              </div>

              <div className="row mono" style={{ gap: 26, fontSize: 12.5, color: 'var(--dim)', flexWrap: 'wrap' }}>
                <span>NO SWAP</span><span style={{ color: 'var(--stroke)' }}>/</span>
                <span>NO ORACLE</span><span style={{ color: 'var(--stroke)' }}>/</span>
                <span>NO SLIPPAGE</span><span style={{ color: 'var(--stroke)' }}>/</span>
                <span>NO MEV</span>
              </div>
            </div>

            <div className="col-5" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div className="slab-lg card" style={{ width: '100%', maxWidth: 428, padding: '30px 30px 26px', alignSelf: 'flex-start' }}>
                <div className="between" style={{ marginBottom: 26 }}>
                  <span className="display" style={{ fontSize: 19, letterSpacing: '0.06em' }}>NVDA CLUB</span>
                  <span className="chip mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--dim)', border: '1px solid var(--stroke)', padding: '5px 9px' }}>SAMPLE</span>
                </div>
                <div className="label" style={{ marginBottom: 8 }}>IN THE JAR</div>
                <div className="stat" style={{ fontSize: 42, marginBottom: 4 }}>1,284.06</div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 26 }}>NVDA</div>
                <div style={{ height: 1, background: 'var(--line)', marginBottom: 22 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 20 }}>
                  <div>
                    <div className="label" style={{ marginBottom: 7 }}>MASCOT</div>
                    <div className="display" style={{ fontSize: 20, color: 'var(--ember-ink)' }}>$GPU</div>
                  </div>
                  <div>
                    <div className="label" style={{ marginBottom: 7 }}>FEES → JAR</div>
                    <div className="stat" style={{ fontSize: 20 }}>10.0%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--band)' }}>
        <div className="shell" style={{ padding: '0 40px' }}>
          <div className="ticker-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
            {STOCKS.map((s) => (
              <div key={s.symbol} style={{ padding: '26px 0', display: 'flex', alignItems: 'baseline', gap: 12, borderRight: '1px solid var(--line-soft)' }}>
                <span className="display" style={{ fontSize: 17, letterSpacing: '0.06em' }}>{s.symbol}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>graduates at {s.graduation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="shell" style={{ padding: '104px 40px 96px' }}>
        <div className="between stack-sm" style={{ alignItems: 'baseline', marginBottom: 56 }}>
          <h2 className="display h-2" style={{ letterSpacing: '-0.01em', margin: 0 }}>HOW THE JAR FILLS</h2>
          <span className="mono" style={{ fontSize: 12, color: 'var(--dim)', letterSpacing: '0.12em' }}>THREE MOVES</span>
        </div>
        <div className="grid-3" style={{ alignItems: 'end' }}>
          {STEPS.map((s) => (
            <div key={s.n} className="slab-lg card"
              style={{ padding: '34px 30px', height: s.h, display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', borderColor: s.accent ? 'var(--ember)' : 'var(--line)' }}>
              <div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--ember-ink)', marginBottom: 18 }}>{s.n}</div>
                <div className="display" style={{ fontSize: 27, letterSpacing: '0.02em', marginBottom: 14 }}>{s.title}</div>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: s.accent ? 'var(--body)' : 'var(--muted)', margin: 0, textWrap: 'pretty' }}>{s.body}</p>
              </div>
              {s.foot && (
                <div className="mono" style={{ fontSize: 12, color: s.accent ? 'var(--ember-ink)' : 'var(--dim)' }}>{s.foot}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: 'var(--band)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="shell" style={{ padding: '96px 40px' }}>
          <div className="grid-12" style={{ alignItems: 'start' }}>
            <div className="col-5">
              <h2 className="display h-1" style={{ lineHeight: 1.02, letterSpacing: '-0.01em', margin: '0 0 22px' }}>
                THERE IS<br />NO SWAP.
              </h2>
              <div style={{ width: 62, height: 3, background: 'var(--ember)' }} />
            </div>
            <div className="col-7">
              <p style={{ fontSize: 18, lineHeight: 1.62, color: 'var(--muted)', margin: '0 0 22px', textWrap: 'pretty' }}>
                Every other version of this idea takes creator fees in ETH and swaps them for stock. That drags in a DEX
                route, a price oracle, slippage, and a sandwich bot sitting on every harvest you ever call.
              </p>
              <p style={{ fontSize: 18, lineHeight: 1.62, color: 'var(--ink)', margin: '0 0 30px', textWrap: 'pretty' }}>
                Pyro prices the mascot against NVDA itself. The fees arrive as NVDA already. Nothing to swap means nothing to skim.
              </p>
              <div className="chip mono" style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '18px 20px', fontSize: 13, lineHeight: 1.7, color: 'var(--dim)' }}>
                <span style={{ color: 'var(--stroke)' }}>$</span> pairTokenEconomics(<span style={{ color: 'var(--ink)' }}>NVDA</span>)<br />
                <span style={{ color: 'var(--stroke)' }}>→</span> phantom <span style={{ color: 'var(--ember-ink)' }}>16.64</span>{'  '}
                threshold <span style={{ color: 'var(--ember-ink)' }}>41.6</span>{'  '}
                decimals <span style={{ color: 'var(--ember-ink)' }}>18</span><br />
                <span style={{ color: 'var(--dim)' }}>{'// verified on mainnet, not a whitepaper claim'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell" style={{ padding: '96px 40px' }}>
        <h2 className="display h-2" style={{ letterSpacing: '-0.01em', margin: '0 0 14px' }}>WHAT YOU&apos;RE ACTUALLY HOLDING</h2>
        <p style={{ fontSize: 17, color: 'var(--dim)', margin: '0 0 52px' }}>
          The parts nobody puts on a landing page. They&apos;re the reason this one works.
        </p>
        <div className="grid-2">
          {HONEST.map((c) => (
            <div key={c.t} className="slab-lg card" style={{ padding: '32px 30px' }}>
              <div className="display" style={{ fontSize: 21, marginBottom: 12 }}>{c.t}</div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', margin: 0, textWrap: 'pretty' }}>{c.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ position: 'relative', borderTop: '1px solid var(--line)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 120%, rgba(255,90,31,0.15), transparent 62%)' }} />
        <div className="shell" style={{ padding: '104px 40px 96px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <h2 className="display h-3" style={{ lineHeight: 1.02, letterSpacing: '-0.015em', margin: '0 0 20px' }}>LIGHT ONE UP.</h2>
          <p style={{ fontSize: 18, color: 'var(--muted)', margin: '0 auto 38px', maxWidth: 480 }}>
            Pick a ticker, seed the jar, let the mascot go to work.
          </p>
          <div className="row" style={{ justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/create" className="btn btn-primary" style={{ display: 'inline-block', padding: '18px 38px', fontSize: 16 }}>OPEN A CLUB</Link>
            <Link href="/clubs" className="btn btn-ghost" style={{ display: 'inline-block', padding: '17px 32px', fontSize: 16, color: 'var(--ink)' }}>BROWSE CLUBS</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
