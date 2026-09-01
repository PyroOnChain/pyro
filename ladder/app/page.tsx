import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Backdrop } from '@/components/Backdrop';
import { Reveal } from '@/components/Reveal';
import { Marquee } from '@/components/Marquee';
import { LadderStatus, LadderRungs } from '@/components/Ladder';
import { BRAND, LADDER, TOKEN, feesAreLadderStock } from '@/lib/config';

const BEATS = [
  // What the first beat can honestly claim depends on what the coin is priced
  // against. If fees already arrive as something the ladder buys, nothing is
  // converted. Otherwise there is a conversion step and the page says so.
  feesAreLadderStock()
    ? {
        n: '01',
        kicker: 'The coin trades',
        title: 'FEES ARRIVE\nAS STOCK.',
        body: `${BRAND.ticker} is priced against tokenized ${TOKEN.quote.symbol} on Pons, so the creator fee on every buy and sell is collected in ${TOKEN.quote.symbol} rather than in the coin. Nothing has to be swapped later and nothing has to be sold to realise it. The fee is already the asset.`,
        accent: 'var(--ember)',
      }
    : {
        n: '01',
        kicker: 'The coin trades',
        title: `FEES ARRIVE\nIN ${TOKEN.quote.symbol}.`,
        body: `${BRAND.ticker} is priced against ${TOKEN.quote.name} on Pons, so the creator fee on every buy and sell is collected in ${TOKEN.quote.symbol}. That is not what the ladder buys, so it gets swapped for stock on the way into the treasury. Fees are earned in one asset and counted in another, and only the second one shows up on this page.`,
        accent: 'var(--ember)',
      },
  {
    n: '02',
    kicker: 'A person moves it',
    title: 'ROUTED\nBY HAND.',
    body: `Fees sit in the Pons escrow until they are claimed and moved to the treasury${feesAreLadderStock() ? '' : ', buying stock along the way'}. There is no contract doing that automatically, which means nothing is on a timer and nothing can be drained by a bug in code we wrote. It also means it happens when a human does it.`,
    accent: 'var(--amber)',
  },
  {
    n: '03',
    kicker: 'The count goes up',
    title: 'ONE WHOLE\nSHARE.',
    body: 'A rung clears when the treasury actually holds that many shares, not when it is close. Fractions are just a balance. A whole share is a thing you either own or do not, which is the only reason the number on this page is worth reading.',
    accent: 'var(--green)',
  },
];

export default function Home() {
  return (
    <>
      <Backdrop />
      <Header />

      {/* ------------------------------------------------------------- hero */}
      <section className="shell" style={{ padding: '76px 30px 64px', position: 'relative', zIndex: 2 }}>
        <Reveal className="row" style={{ gap: 10, marginBottom: 26 }}>
          <span className="chip">Robinhood Chain · 4663</span>
          <span className="chip">Fees paid in {TOKEN.quote.symbol}</span>
        </Reveal>

        <h1 className="display h-hero" style={{ margin: '0 0 30px' }}>
          <Reveal as="span" style={{ display: 'block' }}>THE TREASURY</Reveal>
          <Reveal as="span" delay={120} style={{ display: 'block' }}>
            <span className="outline">CLIMBS</span> <span style={{ color: 'var(--green)' }}>UP.</span>
          </Reveal>
        </h1>

        <div className="grid-2" style={{ gap: 48, alignItems: 'end' }}>
          <div>
            <Reveal as="p" delay={220} style={{ fontSize: 18.5, lineHeight: 1.62, color: 'var(--body)', margin: '0 0 14px', maxWidth: 520 }}>
              A memecoin whose creator fees are collected in tokenized stock and spent on whole shares of it.
              One rung at a time, in public, at an address anyone can open in an explorer.
            </Reveal>
            <Reveal as="p" delay={280} style={{ fontSize: 18.5, color: 'var(--paper)', fontWeight: 600, margin: '0 0 32px' }}>
              You cannot redeem it. You can count it.
            </Reveal>
            <Reveal className="row" delay={360} style={{ gap: 12, flexWrap: 'wrap' }}>
              <Link href="/treasury" className="btn btn-primary">Open the ladder</Link>
              <a href="/#how" className="btn btn-ghost">How it works</a>
            </Reveal>
          </div>

          <Reveal delay={180}>
            <LadderStatus />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------- tape */}
      <div className="tape">
        <Marquee speed={34}>
          {LADDER.map((r, i) => (
            <div className="tape-item" key={i}>
              <span style={{ color: 'var(--paper)', fontWeight: 600 }}>{r.stock.symbol}</span>
              <span>{r.shares} share{r.shares === 1 ? '' : 's'}</span>
              <span style={{ color: 'var(--line-hot)' }}>/</span>
            </div>
          ))}
        </Marquee>
      </div>

      {/* -------------------------------------------------------------- how */}
      <section id="how" className="shell" style={{ padding: '86px 30px 40px', position: 'relative', zIndex: 2 }}>
        <Reveal as="h2" className="display h-1" style={{ margin: '0 0 8px' }}>HOW A RUNG GETS CLEARED</Reveal>
        <Reveal as="p" delay={100} style={{ fontSize: 16, color: 'var(--muted)', margin: '0 0 46px' }}>
          Three steps. Only the last one is worth trusting, and it is the one you can check.
        </Reveal>

        <div style={{ display: 'grid', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {BEATS.map((b, i) => (
            <Reveal key={b.n} delay={i * 90} style={{ background: 'var(--panel)', padding: '34px 30px' }}>
              <div className="grid-2" style={{ gap: 34, alignItems: 'start' }}>
                <div>
                  <div className="row" style={{ gap: 11, marginBottom: 14 }}>
                    <span className="dot" style={{ background: b.accent }} />
                    <span className="label" style={{ color: b.accent }}>{b.n} · {b.kicker}</span>
                  </div>
                  <div className="display" style={{ fontSize: 'clamp(26px, 3.6vw, 40px)', whiteSpace: 'pre-line' }}>
                    {b.title}
                  </div>
                </div>
                <p style={{ fontSize: 15.5, lineHeight: 1.68, color: 'var(--body)', margin: 0 }}>{b.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- honest */}
      <section className="shell" style={{ padding: '54px 30px 40px', position: 'relative', zIndex: 2 }}>
        <div className="grid-2" style={{ gap: 46, alignItems: 'start' }}>
          <div>
            <Reveal as="h2" className="display h-1" style={{ margin: '0 0 20px', lineHeight: 0.92 }}>
              WHAT THIS<br /><span className="outline">IS NOT</span>
            </Reveal>
            <Reveal as="p" delay={120} style={{ fontSize: 16, lineHeight: 1.68, color: 'var(--body)', margin: 0, maxWidth: 460 }}>
              Plenty of projects promise a treasury and show you a number they typed. The only thing that makes
              this one different is that the number has an address under it. So here is the honest version of
              what you are looking at.
            </Reveal>
          </div>

          <Reveal delay={140} style={{ display: 'grid', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            {[
              ['Not backed.', `The treasury does not back ${BRAND.ticker} and holders have no claim on it. If the coin goes to zero the shares stay where they are.`],
              ['Not redeemable.', 'There is no contract that will swap your coins for stock. There is no contract at all. That is deliberate, and it cuts both ways.'],
              ['Not automatic.', 'Fees reach the treasury because someone claims them and sends them. Nothing enforces that. The bar shows what actually arrived, never what was promised.'],
              ['Not a security.', `${BRAND.ticker} is a memecoin. Buying it is not an investment in anything and it entitles you to nothing.`],
            ].map(([t, b], i) => (
              <div key={i} style={{ background: 'var(--panel)', padding: '20px 22px' }}>
                <div className="display" style={{ fontSize: 19, marginBottom: 7, color: 'var(--ember)' }}>{t}</div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--body)', margin: 0 }}>{b}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- ladder */}
      <section className="shell" style={{ padding: '60px 30px 90px', position: 'relative', zIndex: 2 }}>
        <div className="spread" style={{ marginBottom: 26, gap: 16, flexWrap: 'wrap' }}>
          <Reveal as="h2" className="display h-1" style={{ margin: 0 }}>THE LADDER</Reveal>
          <Reveal delay={90}><Link href="/treasury" className="btn btn-ghost">Full treasury ↗</Link></Reveal>
        </div>
        <Reveal delay={130}><LadderRungs /></Reveal>
      </section>

      <Footer />
    </>
  );
}
