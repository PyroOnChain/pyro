import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { Marquee } from '@/components/Marquee';
import { Magnetic } from '@/components/Magnetic';
import { ArenaCanvas } from '@/components/ArenaCanvas';
import { FeaturedFight } from '@/components/FeaturedFight';
import { STOCKS } from '@/lib/addresses';

const ACCENTS = ['var(--red)', 'var(--blue)', 'var(--lime)'];

const BEATS = [
  {
    n: '01',
    kicker: 'THE BELL',
    title: 'TWO COINS,\nONE BLOCK.',
    body: 'Both memecoins launch in the same transaction, priced against the same tokenized stock. Same second, same terms. Neither corner gets a head start because there is no gap to take one in.',
    foot: 'launchToken() × 2',
  },
  {
    n: '02',
    kicker: 'THE HOUR',
    title: 'PICK A SIDE.\nHOLD IT.',
    body: 'Your stock buys that side’s coin and the arena holds it for you. It knows exactly how much you backed and exactly how long you stayed, which is the only reason payouts can be honest without a spreadsheet somewhere.',
    foot: 'enter(side, amount)',
  },
  {
    n: '03',
    kicker: 'THE BELL AGAIN',
    title: 'THE PEAK\nTAKES IT.',
    body: 'Not the closing price. The highest market cap either side ever touched. Buying big at 59:59 does not steal a match you never led, because you would have to beat the other corner’s best moment, not its last one.',
    foot: 'settle() → winner',
  },
];

const RULES = [
  { t: 'The peak is what counts.', b: 'A late buy cannot flip a match it never led. Leading early is worth something.', c: 'var(--red)' },
  { t: 'Time held decides your cut.', b: 'How much, multiplied by how long. Minute-59 money earns minute-59 money.', c: 'var(--blue)' },
  { t: 'Winners take both fee streams.', b: 'Every creator fee from both coins, the loser’s included, in the stock they were priced in.', c: 'var(--gold)' },
  { t: 'Losing is not liquidation.', b: 'You keep every token you bought and can pull it out whenever. You forfeit the purse, not the bag.', c: 'var(--violet)' },
];

export default function LandingPage() {
  return (
    <>
      <ArenaCanvas />
      <Header />

      {/* ------------------------------------------------------------ hero */}
      <section className="shell hero-full" style={{ padding: '10px 36px 60px' }}>
        <Reveal className="row" style={{ gap: 10, marginBottom: 22 }}>
          <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--lime)', display: 'block' }} />
          <span className="label blink" style={{ color: 'var(--muted)' }}>LIVE ON ROBINHOOD CHAIN · 4663</span>
        </Reveal>

        <h1 className="display h-hero" style={{ margin: '0 0 26px' }}>
          <Reveal as="span" variant="wipe" className="line l1" style={{ display: 'block' }}>TWO COINS ENTER.</Reveal>
          <Reveal as="span" variant="wipe" delay={150} className="line l2" style={{ display: 'block' }}>
            ONE GETS <span style={{ color: 'var(--gold)' }}>PAID.</span>
          </Reveal>
        </h1>

        <div className="grid-2" style={{ gap: 44, alignItems: 'end' }}>
          <div>
            <Reveal as="p" delay={280} style={{ fontSize: 18.5, lineHeight: 1.6, color: 'var(--body)', margin: '0 0 14px', maxWidth: 520 }}>
              Two memecoins. One hour. Same stock, same starting block. Whichever side hits the higher
              market cap takes the creator fees from <em style={{ color: 'var(--ink)', fontStyle: 'normal' }}>both</em> of them.
            </Reveal>
            <Reveal as="p" delay={340} style={{ fontSize: 18.5, color: 'var(--ink)', fontWeight: 700, margin: '0 0 30px' }}>
              Lose and you keep the bag. You just don’t get the purse.
            </Reveal>

            <Reveal className="row" delay={420} style={{ gap: 12, flexWrap: 'wrap' }}>
              <Magnetic><Link href="/battles" className="btn btn-gold">See the fights</Link></Magnetic>
              <Magnetic><Link href="/start" className="btn btn-ghost">Start one</Link></Magnetic>
            </Reveal>
          </div>

          <Reveal variant="rise" delay={220}>
            <FeaturedFight />
          </Reveal>
        </div>

        <Reveal className="row nudge" delay={620} style={{ gap: 9, marginTop: 46, color: 'var(--dim)' }}>
          <span className="label">SCROLL</span>
          <span style={{ fontSize: 13 }}>↓</span>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------ strip */}
      <div className="skew-strip">
        <Marquee speed={26}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skew-item">
              <span>TWO COINS ENTER</span><span>◆</span><span>ONE GETS PAID</span><span>◆</span>
            </div>
          ))}
        </Marquee>
      </div>

      {/* ------------------------------------------------------------ beats */}
      <section className="shell" style={{ padding: '80px 36px 60px', position: 'relative', zIndex: 2 }}>
        <Reveal as="h2" variant="wipe" className="display h-1" style={{ margin: '0 0 6px' }}>HOW A FIGHT WORKS</Reveal>
        <Reveal as="p" delay={110} style={{ fontSize: 16.5, color: 'var(--muted)', margin: '0 0 18px' }}>
          One hour, start to finish.
        </Reveal>

        {BEATS.map((b, i) => (
          <Reveal key={b.n} variant="rise" delay={i * 80} className={`beat${i % 2 === 1 ? ' flip' : ''}`}>
            <div className="row" style={{ gap: 22, justifyContent: i % 2 === 1 ? 'flex-end' : 'flex-start' }}>
              <div className={`bignum ${['on-a', 'on-b', 'on-c'][i]}`}>{b.n}</div>
            </div>
            <div>
              <div className="row" style={{ gap: 11, marginBottom: 12 }}>
                <span className="dot" style={{ width: 14, height: 14, background: ACCENTS[i] }} />
                <span className="label" style={{ color: ACCENTS[i] }}>{b.kicker}</span>
              </div>
              <div className="display" style={{ fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 0.95, marginBottom: 14, whiteSpace: 'pre-line' }}>
                {b.title}
              </div>
              <p style={{ fontSize: 16, lineHeight: 1.62, color: 'var(--body)', margin: '0 0 14px', maxWidth: 560 }}>{b.body}</p>
              <div className="mono" style={{ fontSize: 12.5, color: ACCENTS[i] }}>{b.foot}</div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* ------------------------------------------------------------ strip */}
      <div className="skew-strip alt">
        <Marquee speed={22}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skew-item">
              <span>THE LOSER PAYS THE WINNER</span><span>◆</span>
            </div>
          ))}
        </Marquee>
      </div>

      {/* ------------------------------------------------------------ split */}
      <section style={{ position: 'relative', zIndex: 2, padding: '90px 0' }}>
        <div className="shell" style={{ padding: '0 36px' }}>
          <div className="grid-2" style={{ gap: 52, alignItems: 'center' }}>
            <div>
              <Reveal as="h2" variant="wipe" className="display h-1" style={{ margin: '0 0 20px', lineHeight: 0.92 }}>
                THE LOSER<br /><span className="outline">PAYS THE</span><br /><span style={{ color: 'var(--gold)' }}>WINNER.</span>
              </Reveal>
              <Reveal as="p" delay={140} style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--body)', margin: 0, maxWidth: 460 }}>
                Every trade of either coin charges a creator fee. Both streams point at the arena, and when the
                bell rings they are handed to the winning side for good. Everyone who backed the losing coin
                spent the hour funding the other corner.
              </Reveal>
            </div>

            <Reveal variant="rise" delay={120} className="panel plate slam mono"
              style={{ padding: '24px 26px', fontSize: 13.5, lineHeight: 1.95, color: 'var(--muted)' }}>
              <div><span style={{ color: 'var(--dim)' }}>$</span> settle()</div>
              <div><span style={{ color: 'var(--dim)' }}>→</span> peak <span style={{ color: 'var(--red)' }}>A 38.40</span> vs <span style={{ color: 'var(--blue)' }}>B 26.10</span></div>
              <div><span style={{ color: 'var(--dim)' }}>→</span> winner <span style={{ color: 'var(--red)' }}>SIDE A</span></div>
              <div><span style={{ color: 'var(--dim)' }}>→</span> streams <span style={{ color: 'var(--gold)' }}>A + B</span> → side A</div>
              <div style={{ color: 'var(--dim)', marginTop: 8 }}>{'// weighted by how much, and how long'}</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ rules */}
      <section className="shell" style={{ padding: '20px 36px 90px', position: 'relative', zIndex: 2 }}>
        <Reveal as="h2" variant="wipe" className="display h-1" style={{ margin: '0 0 34px' }}>
          READ THIS <span className="outline">BEFORE</span> YOU PICK.
        </Reveal>

        <div className="grid-2" style={{ gap: 18 }}>
          {RULES.map((r, i) => (
            <Reveal key={r.t} variant="rise" delay={i * 80} className="panel plate slam"
              style={{ padding: '26px 26px', marginTop: i % 2 === 1 ? 34 : 0 }}>
              <div className="row" style={{ gap: 12, marginBottom: 11 }}>
                <span className="dot" style={{ background: r.c }} />
                <div className="display" style={{ fontSize: 21 }}>{r.t}</div>
              </div>
              <p style={{ fontSize: 15.5, lineHeight: 1.62, color: 'var(--body)', margin: 0 }}>{r.b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ ticker */}
      <div style={{ borderTop: '2px solid var(--line)', borderBottom: '2px solid var(--line)', background: 'var(--surface)', position: 'relative', zIndex: 2 }}>
        <Marquee speed={40}>
          {[...STOCKS, ...STOCKS, ...STOCKS].map((s, i) => (
            <div key={`${s.symbol}-${i}`} className="row" style={{ padding: '15px 28px', gap: 12, whiteSpace: 'nowrap' }}>
              <span className="display" style={{ fontSize: 16 }}>{s.symbol}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>fight in {s.name}</span>
              <span aria-hidden="true" style={{ marginLeft: 20, color: 'var(--line)' }}>◆</span>
            </div>
          ))}
        </Marquee>
      </div>

      {/* ------------------------------------------------------------ cta */}
      <section style={{ position: 'relative', zIndex: 2, padding: '104px 0 96px', textAlign: 'center' }}>
        <div className="shell" style={{ padding: '0 36px' }}>
          <Reveal as="h2" variant="wipe" className="display" style={{ fontSize: 'clamp(44px, 9vw, 108px)', lineHeight: 0.9, margin: '0 0 20px', letterSpacing: '-0.035em' }}>
            PICK A <span style={{ color: 'var(--red)' }}>CORNER.</span>
          </Reveal>
          <Reveal as="p" delay={130} style={{ fontSize: 17.5, color: 'var(--muted)', margin: '0 auto 34px', maxWidth: 480 }}>
            Anyone can start a fight. Anyone can join one. One transaction and an hour of your attention.
          </Reveal>
          <Reveal className="row" delay={220} style={{ justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Magnetic><Link href="/battles" className="btn btn-gold">See the fights</Link></Magnetic>
            <Magnetic><Link href="/start" className="btn btn-ghost">Start one</Link></Magnetic>
          </Reveal>
        </div>
      </section>

      <Footer />
    </>
  );
}
