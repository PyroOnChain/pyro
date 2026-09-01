import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { Marquee } from '@/components/Marquee';
import { Magnetic } from '@/components/Magnetic';
import { FeaturedFight } from '@/components/FeaturedFight';
import { STOCKS } from '@/lib/addresses';

const ACCENTS = ['var(--red)', 'var(--blue)', 'var(--lime)'];

const ROUNDS = [
  {
    n: 'ROUND 1',
    title: 'THE BELL',
    body: 'Two memecoins launch in the same transaction, priced against the same tokenized stock. Same second, same terms, no head start for either corner.',
  },
  {
    n: 'ROUND 2',
    title: 'THE HOUR',
    body: 'Pick a side and buy in. Your stock buys that side’s coin and the arena holds it, so it can measure exactly how much you backed and for how long.',
  },
  {
    n: 'ROUND 3',
    title: 'THE BELL AGAIN',
    body: 'The side that touched the highest market cap wins. Not the closing price, the highest point it ever reached, so nobody steals it with one buy at 59:59.',
  },
];

const RULES = [
  {
    t: 'The peak is what counts.',
    b: 'A late buy cannot flip a match it never led. To win you have to beat the other side’s best moment, which means leading early is worth something.',
  },
  {
    t: 'Time held decides your cut.',
    b: 'Payouts weight how much you held by how long you held it. Piling into the obvious winner at minute 59 earns close to nothing, because it should.',
  },
  {
    t: 'The winners take both fee streams.',
    b: 'Every creator fee from both coins, the loser’s included, gets paid to the winning side in the stock they were priced in. It keeps paying long after the hour is up.',
  },
  {
    t: 'Losing is not liquidation.',
    b: 'Lose and you keep every token you bought. You can pull them out at any point, during the fight or after it. What you forfeit is the fees, not the bag.',
  },
];

export default function LandingPage() {
  return (
    <>
      <Header />

      {/* ------------------------------------------------------------ hero */}
      <section className="shell" style={{ padding: '84px 36px 72px', position: 'relative' }}>
        <Reveal className="row" style={{ gap: 10, marginBottom: 26 }}>
          <span className="pulse-dot" style={{ width: 7, height: 7, background: 'var(--live)', display: 'block' }} />
          <span className="label" style={{ color: 'var(--muted)' }}>LIVE ON ROBINHOOD CHAIN</span>
        </Reveal>

        <h1 className="display h-hero" style={{ margin: '0 0 30px' }}>
          <Reveal as="span" variant="wipe" style={{ display: 'block' }}>TWO COINS ENTER.</Reveal>
          <Reveal as="span" variant="wipe" delay={160} style={{ display: 'block' }}>
            ONE GETS <span style={{ color: 'var(--gold)' }}>PAID.</span>
          </Reveal>
        </h1>

        <div className="grid-2" style={{ gap: 46, alignItems: 'start' }}>
          <div>
            <Reveal as="p" delay={300} style={{ fontSize: 19, lineHeight: 1.6, color: 'var(--body)', margin: '0 0 18px', maxWidth: 560 }}>
              Two memecoins launch at the same second, priced in the same tokenized stock. For one hour
              they fight for market cap. Whichever side hits the higher peak takes the creator fees from
              <em style={{ color: 'var(--ink)', fontStyle: 'normal' }}> both</em> coins, paid out in that stock.
            </Reveal>
            <Reveal as="p" delay={380} style={{ fontSize: 19, color: 'var(--ink)', fontWeight: 600, margin: '0 0 34px' }}>
              Back the wrong horse and you still keep your bag. You just don’t get the purse.
            </Reveal>

            <Reveal className="row" delay={460} style={{ gap: 12, flexWrap: 'wrap' }}>
              <Magnetic>
                <Link href="/battles" className="btn btn-gold">See the fights</Link>
              </Magnetic>
              <Magnetic>
                <Link href="/start" className="btn btn-ghost">Start one</Link>
              </Magnetic>
            </Reveal>
          </div>

          {/* the headline fight, live from the chain when one is running */}
          <Reveal variant="rise" delay={260}>
            <FeaturedFight />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ ticker */}
      <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <Marquee speed={44}>
          {[...STOCKS, ...STOCKS, ...STOCKS].map((s, i) => (
            <div key={`${s.symbol}-${i}`} className="row"
              style={{ padding: '16px 30px', gap: 12, whiteSpace: 'nowrap' }}>
              <span className="display" style={{ fontSize: 17 }}>{s.symbol}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>fight in {s.name}</span>
              <span aria-hidden="true" style={{ marginLeft: 22, color: 'var(--line)' }}>◆</span>
            </div>
          ))}
        </Marquee>
      </div>

      {/* ------------------------------------------------------------ rounds */}
      <section className="shell" style={{ padding: '92px 36px 80px' }}>
        <div style={{ marginBottom: 52 }}>
          <Reveal as="h2" variant="wipe" className="display h-1" style={{ margin: '0 0 12px' }}>HOW A FIGHT WORKS</Reveal>
          <Reveal as="p" delay={120} style={{ fontSize: 17, color: 'var(--muted)', margin: 0, maxWidth: 560 }}>
            One hour, start to finish. Three moves and you have the whole thing.
          </Reveal>
        </div>

        <div className="grid-3">
          {ROUNDS.map((r, i) => (
            <Reveal key={r.n} variant="rise" delay={i * 110} className="panel plate lift" style={{ padding: '30px 26px 28px' }}>
              <div className="row" style={{ gap: 11, marginBottom: 20 }}>
                <span className="dot" style={{ width: 16, height: 16, background: ACCENTS[i] }} />
                <span className="label" style={{ color: ACCENTS[i] }}>{r.n}</span>
              </div>
              <div className="display" style={{ fontSize: 27, marginBottom: 14, color: ACCENTS[i] }}>{r.title}</div>
              <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--body)', margin: 0 }}>{r.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ the split */}
      <section style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="shell" style={{ padding: '84px 36px' }}>
          <div className="grid-2" style={{ gap: 56, alignItems: 'center' }}>
            <div>
              <Reveal as="h2" variant="wipe" className="display h-1" style={{ margin: '0 0 20px' }}>
                THE LOSER<br />PAYS THE<br /><span style={{ color: 'var(--gold)' }}>WINNER.</span>
              </Reveal>
              <Reveal as="p" delay={160} style={{ fontSize: 17.5, lineHeight: 1.65, color: 'var(--body)', margin: 0, maxWidth: 480 }}>
                Every trade of either coin charges a creator fee. Normally that goes to whoever launched it.
                Here both streams are pointed at the arena, and when the bell rings they are handed to the
                winning side for good. Everyone who bought the losing coin spent the hour funding the other corner.
              </Reveal>
            </div>

            <Reveal variant="rise" delay={140} className="panel-2 plate mono"
              style={{ padding: '26px 26px', fontSize: 13.5, lineHeight: 1.9, color: 'var(--muted)' }}>
              <div><span style={{ color: 'var(--dim)' }}>$</span> settle()</div>
              <div><span style={{ color: 'var(--dim)' }}>→</span> peak <span style={{ color: 'var(--red)' }}>A 38.40</span> vs <span style={{ color: 'var(--blue)' }}>B 26.10</span></div>
              <div><span style={{ color: 'var(--dim)' }}>→</span> winner <span style={{ color: 'var(--red)' }}>SIDE A</span></div>
              <div><span style={{ color: 'var(--dim)' }}>→</span> fee streams <span style={{ color: 'var(--gold)' }}>A + B</span> → side A holders</div>
              <div style={{ color: 'var(--dim)', marginTop: 8 }}>{'// weighted by how much, and how long'}</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ rules */}
      <section className="shell" style={{ padding: '88px 36px 80px' }}>
        <Reveal as="h2" variant="wipe" className="display h-1" style={{ margin: '0 0 12px' }}>THE RULES THAT MATTER</Reveal>
        <Reveal as="p" delay={120} style={{ fontSize: 17, color: 'var(--muted)', margin: '0 0 46px', maxWidth: 600 }}>
          Four things decide whether this is worth your money. Read them before you pick a corner.
        </Reveal>

        <div className="grid-2">
          {RULES.map((r, i) => (
            <Reveal key={r.t} variant="rise" delay={i * 90} className="panel plate lift" style={{ padding: '28px 26px' }}>
              <div className="row" style={{ gap: 12, marginBottom: 12 }}>
                <span className="dot" style={{ background: ['var(--red)', 'var(--blue)', 'var(--gold)', 'var(--violet)'][i] }} />
                <div className="display" style={{ fontSize: 22 }}>{r.t}</div>
              </div>
              <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--body)', margin: 0 }}>{r.b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ cta */}
      <section style={{ borderTop: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }}>
        <div className="shell" style={{ padding: '96px 36px 88px', textAlign: 'center' }}>
          <Reveal as="h2" variant="wipe" className="display h-1" style={{ margin: '0 0 18px' }}>
            PICK A <span style={{ color: 'var(--red)' }}>CORNER.</span>
          </Reveal>
          <Reveal as="p" delay={140} style={{ fontSize: 18, color: 'var(--muted)', margin: '0 auto 36px', maxWidth: 520 }}>
            Anyone can start a fight and anyone can join one. It takes one transaction and an hour of your attention.
          </Reveal>
          <Reveal className="row" delay={240} style={{ justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Magnetic><Link href="/battles" className="btn btn-gold">See the fights</Link></Magnetic>
            <Magnetic><Link href="/start" className="btn btn-ghost">Start one</Link></Magnetic>
          </Reveal>
        </div>
      </section>

      <Footer />
    </>
  );
}

