import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { STOCKS } from '@/lib/addresses';
import { Reveal } from '@/components/Reveal';
import { CountUp } from '@/components/CountUp';
import { Marquee } from '@/components/Marquee';
import { Magnetic } from '@/components/Magnetic';
import { PixelScene } from '@/components/PixelScene';

/** The four things that follow from pricing the mascot in the stock itself. */
const SLOTS = [
  { k: 'NO SWAP', v: 'fees arrive as the stock' },
  { k: 'NO ORACLE', v: 'nothing to price' },
  { k: 'NO SLIPPAGE', v: 'nothing to route' },
  { k: 'NO MEV', v: 'nothing to sandwich' },
];

const STEPS = [
  {
    n: '01', title: 'DEPOSIT', foot: null,
    body: 'Put NVDA in, get share tokens back. Own a tenth of the vault and you own a tenth of the shares. Walk out whenever you want.',
  },
  {
    n: '02', title: 'LAUNCH', foot: 'one club, one mascot',
    body: 'The club fires exactly one mascot on Pons, priced in NVDA. It graduates once 41.6 NVDA has moved through the curve. That is the whole supply schedule.',
  },
  {
    n: '03', title: 'HARVEST', foot: 'harvest() → vault',
    body: 'Creator fees stack up as NVDA. Anyone can call harvest and keep 0.25% for their trouble. The vault gets fatter, so your slice gets fatter. Nobody sold anything to make that happen.',
  },
];

const HONEST = [
  { t: 'Stock, not hopium.', b: "The vault only ever holds NVDA. It never buys the mascot, never holds it, never counts it as an asset. If the mascot rugs at 3am, the vault doesn't move." },
  { t: 'Harvests drip for 24h.', b: "Fees don't land in one block. They release over 24 hours, so depositing a second before a harvest and leaving right after loses money. There's a test named after that exact attack." },
  { t: '0% protocol fee.', b: 'We take nothing today. The contract can never take more than 10% of a harvest, and that ceiling is compiled in, not a governance vote we promise to lose.' },
  { t: 'Exit fees stay in the vault.', b: 'Leave and half a percent of your slice stays behind. It does not come to us. It goes to whoever is still holding.' },
];

export default function LandingPage() {
  return (
    <>
      <Header />

      {/* ---------------------------------------------------------------- hero
          A centred statement over the horizon, with the sample club sitting on
          the waterline. The old build put the pitch and the card side by side;
          stacking them gives the scene room to actually be seen. */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="shell" style={{ padding: '84px 40px 58px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <Reveal className="row" style={{ gap: 10, marginBottom: 26, justifyContent: 'center' }}>
            <span className="pulse-dot" style={{ width: 7, height: 7, background: 'var(--accent)', display: 'block' }} />
            <span className="mono" style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--muted)' }}>
              LIVE ON ROBINHOOD CHAIN
            </span>
          </Reveal>

          <h1 className="display h-hero" style={{ lineHeight: 0.94, letterSpacing: '-0.02em', margin: '0 0 26px' }}>
            <Reveal as="span" variant="wipe" delay={80} style={{ display: 'block' }}>YOUR MEME BUYS</Reveal>
            <Reveal as="span" variant="wipe" delay={210} style={{ display: 'block', color: 'var(--accent-ink)' }}>YOUR STOCK.</Reveal>
          </h1>

          <Reveal as="p" delay={360} style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--body)', margin: '0 auto 16px', maxWidth: 660, textWrap: 'pretty' }}>
            Put tokenized NVDA in the vault. VaultTube launches one mascot coin for the club, priced in NVDA
            instead of ETH. Every trade of that mascot sends the creator fee back to the vault as more NVDA.
          </Reveal>
          <Reveal as="p" delay={440} style={{ fontSize: 19, color: 'var(--ink)', margin: '0 auto 36px', fontWeight: 700 }}>
            Mascot goes to zero? You still own the stock.
          </Reveal>

          <Reveal className="row" delay={520} style={{ gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Magnetic>
              <Link href="/create" className="btn btn-primary" style={{ display: 'inline-block', padding: '18px 34px', fontSize: 16 }}>
                OPEN A CLUB
              </Link>
            </Magnetic>
            <Magnetic>
              <Link href="/clubs" className="btn btn-ghost" style={{ display: 'inline-block', padding: '17px 30px', fontSize: 16, color: 'var(--ink)' }}>
                SEE THE CLUBS
              </Link>
            </Magnetic>
          </Reveal>
        </div>

        <PixelScene />

        <div className="shore">
        {/* the sample club, pulled up so it stands on the water */}
        <div className="shell" style={{ padding: '0 40px', marginTop: -76, position: 'relative', zIndex: 3 }}>
          <Reveal variant="rise" delay={260} className="card lift"
            style={{ width: '100%', maxWidth: 470, margin: '0 auto', padding: '28px 30px 26px' }}>
            <div className="between" style={{ marginBottom: 22 }}>
              <span className="display" style={{ fontSize: 19, letterSpacing: '0.05em' }}>NVDA CLUB</span>
              <span className="chip mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--dim)', padding: '5px 9px' }}>SAMPLE</span>
            </div>
            <div className="label" style={{ marginBottom: 8 }}>IN THE VAULT</div>
            <div className="stat" style={{ fontSize: 42, marginBottom: 4 }}><CountUp value={1284.06} /></div>
            <div className="mono" style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22 }}>NVDA</div>
            <div className="pxrule" style={{ marginBottom: 20 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 20 }}>
              <div>
                <div className="label" style={{ marginBottom: 7 }}>MASCOT</div>
                <div className="display" style={{ fontSize: 20, color: 'var(--accent-ink)' }}>$GPU</div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 7 }}>FEES → VAULT</div>
                <div className="stat" style={{ fontSize: 20 }}>10.0%</div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* the four consequences, as inventory slots */}
        <div className="shell" style={{ padding: '44px 40px 0' }}>
          <Reveal variant="rise" delay={380} className="hotbar">
            {SLOTS.map((s) => (
              <div key={s.k}>
                <div className="display" style={{ fontSize: 15, letterSpacing: '0.05em', marginBottom: 5 }}>{s.k}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.v}</div>
              </div>
            ))}
          </Reveal>
        </div>
        </div>
      </section>

      <div style={{ borderTop: '3px solid var(--ink)', borderBottom: '3px solid var(--ink)', background: 'var(--band)' }}>
        <Marquee speed={38}>
          {[...STOCKS, ...STOCKS].map((s, i) => (
            <div key={`${s.symbol}-${i}`}
              style={{ padding: '22px 40px', display: 'flex', alignItems: 'baseline', gap: 12, whiteSpace: 'nowrap' }}>
              <span className="display" style={{ fontSize: 17, letterSpacing: '0.05em' }}>{s.symbol}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>graduates at {s.graduation}</span>
              <span aria-hidden="true" style={{ marginLeft: 28, color: 'var(--muted)' }}>/</span>
            </div>
          ))}
        </Marquee>
      </div>

      {/* ------------------------------------------------------------- quest */}
      <section className="shell" style={{ padding: '96px 40px 90px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Reveal as="h2" variant="wipe" className="display h-2" style={{ letterSpacing: '-0.01em', margin: '0 0 10px' }}>HOW THE VAULT FILLS</Reveal>
          <Reveal as="p" delay={120} style={{ fontSize: 16, color: 'var(--muted)', margin: '0 auto', maxWidth: 520, textWrap: 'pretty' }}>
            A club is a shared pot of one stock. Three moves, start to finish.
          </Reveal>
        </div>

        <div className="quest">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} variant="rise" delay={i * 110}
              className={`card lift quest-step${i % 2 === 1 ? ' alt' : ''}`}>
              <div className="quest-num display">{s.n}</div>
              <div className="quest-text" style={{ maxWidth: 560 }}>
                <div className="display" style={{ fontSize: 28, letterSpacing: '0.02em', marginBottom: 12 }}>{s.title}</div>
                <p style={{ fontSize: 16, lineHeight: 1.62, color: 'var(--body)', margin: 0, textWrap: 'pretty' }}>{s.body}</p>
                {s.foot && (
                  <div className="mono" style={{ fontSize: 12.5, color: 'var(--accent-ink)', marginTop: 16 }}>{s.foot}</div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- the dark set piece */}
      <section className="sect-dark" style={{ borderTop: '3px solid var(--ink)', borderBottom: '3px solid var(--ink)' }}>
        <div className="shell" style={{ padding: '96px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 46 }}>
            <h2 className="display h-1" style={{ lineHeight: 1.02, letterSpacing: '-0.01em', margin: '0 0 16px' }}>
              <Reveal as="span" variant="wipe" style={{ display: 'block' }}>THERE IS NO SWAP.</Reveal>
            </h2>
            <Reveal as="p" delay={200} style={{ fontSize: 16, margin: '0 auto', maxWidth: 540, textWrap: 'pretty' }}>
              Skip this part if you like. It only matters if you have seen this idea done badly before.
            </Reveal>
          </div>

          <div className="grid-2" style={{ gap: 40, marginBottom: 40 }}>
            <Reveal as="p" style={{ fontSize: 17.5, lineHeight: 1.62, margin: 0, textWrap: 'pretty' }}>
              Every other version of this idea takes creator fees in ETH and swaps them for stock. That drags in
              a DEX route, a price oracle, slippage, and a sandwich bot sitting on every harvest you ever call.
            </Reveal>
            <Reveal as="p" delay={130} style={{ fontSize: 17.5, lineHeight: 1.62, margin: 0, color: 'var(--on-ink)', fontWeight: 700, textWrap: 'pretty' }}>
              VaultTube prices the mascot against NVDA itself. The fees arrive as NVDA already. Nothing to swap
              means nothing to skim.
            </Reveal>
          </div>

          <Reveal variant="rise" delay={200} className="card mono"
            style={{ padding: '22px 24px', fontSize: 13.5, lineHeight: 1.8 }}>
            <span style={{ color: 'var(--on-ink-dim)' }}>$</span> pairTokenEconomics(<span style={{ color: 'var(--on-ink-accent)' }}>NVDA</span>)<br />
            <span style={{ color: 'var(--on-ink-dim)' }}>→</span> phantom <span style={{ color: 'var(--on-ink-accent)' }}>16.64</span>{'  '}
            threshold <span style={{ color: 'var(--on-ink-accent)' }}>41.6</span>{'  '}
            decimals <span style={{ color: 'var(--on-ink-accent)' }}>18</span><br />
            <span style={{ color: 'var(--on-ink-dim)' }}>{'// verified on mainnet, not a whitepaper claim'}</span>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------------- bento */}
      <section className="shell" style={{ padding: '92px 40px' }}>
        <Reveal as="h2" variant="wipe" className="display h-2" style={{ letterSpacing: '-0.01em', margin: '0 0 14px' }}>WHAT YOU&apos;RE ACTUALLY HOLDING</Reveal>
        <Reveal as="p" delay={120} style={{ fontSize: 17, color: 'var(--muted)', margin: '0 0 48px', maxWidth: 620, textWrap: 'pretty' }}>
          The parts nobody puts on a landing page. If you are weighing up whether to put money in,
          these four are the ones that decide it.
        </Reveal>
        <div className="bento">
          {HONEST.map((c, i) => (
            <Reveal key={c.t} variant="rise" delay={i * 100} className="card lift" style={{ padding: '30px 30px' }}>
              <div className="display" style={{ fontSize: 21, marginBottom: 12 }}>{c.t}</div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', margin: 0, textWrap: 'pretty' }}>{c.b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- cta */}
      <section style={{ position: 'relative', borderTop: '3px solid var(--ink)', background: 'var(--band)', overflow: 'hidden' }}>
        <div className="shell" style={{ padding: '92px 40px 84px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <Reveal as="h2" variant="wipe" className="display h-3" style={{ lineHeight: 1.02, letterSpacing: '-0.015em', margin: '0 0 18px' }}>OPEN ONE UP.</Reveal>
          <Reveal as="p" delay={140} style={{ fontSize: 18, color: 'var(--muted)', margin: '0 auto 36px', maxWidth: 520, textWrap: 'pretty' }}>
            Opening a club takes one transaction and a few dollars. Joining someone else&apos;s takes
            one signature.
          </Reveal>
          <Reveal className="row" delay={250} style={{ justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Magnetic strength={0.34}>
              <Link href="/create" className="btn btn-primary" style={{ display: 'inline-block', padding: '18px 38px', fontSize: 16 }}>OPEN A CLUB</Link>
            </Magnetic>
            <Magnetic strength={0.34}>
              <Link href="/clubs" className="btn btn-ghost" style={{ display: 'inline-block', padding: '17px 32px', fontSize: 16, color: 'var(--ink)' }}>BROWSE CLUBS</Link>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      <Footer />
    </>
  );
}
