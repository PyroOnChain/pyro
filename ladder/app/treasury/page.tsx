import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Backdrop } from '@/components/Backdrop';
import { Reveal } from '@/components/Reveal';
import { LadderStatus, LadderRungs } from '@/components/Ladder';
import { BRAND, TREASURY, FEE_WALLET, TOKEN, LADDER } from '@/lib/config';
import { FEE_ESCROW } from '@/lib/abi';
import { explorerAddr } from '@/lib/chain';

/**
 * Without this, the root layout's canonical ('/') applies here too and the page
 * tells search engines it is a duplicate of the home page.
 */
export const metadata: Metadata = {
  title: 'Treasury',
  description: `Every whole share ${BRAND.name} owns, read live from Robinhood Chain, with the addresses to check it yourself.`,
  alternates: { canonical: '/treasury/' },
  openGraph: { title: `${BRAND.name} treasury`, url: '/treasury/' },
};

type Row = { label: string; addr: string; note: string };

function addresses(): Row[] {
  const rows: Row[] = [];
  if (TREASURY) rows.push({ label: 'Treasury', addr: TREASURY, note: 'Holds the shares. This balance is the scoreboard.' });
  if (TOKEN.address) rows.push({ label: `${BRAND.ticker} token`, addr: TOKEN.address, note: 'The coin itself, launched on Pons.' });
  if (FEE_WALLET) rows.push({ label: 'Fee recipient', addr: FEE_WALLET, note: 'Where Pons credits creator fees before they are routed.' });
  rows.push({ label: 'Pons fee escrow', addr: FEE_ESCROW, note: 'Pons contract that holds creator fees until they are claimed.' });
  const seen = new Set<string>();
  for (const r of LADDER) {
    if (seen.has(r.stock.symbol)) continue;
    seen.add(r.stock.symbol);
    rows.push({ label: `${r.stock.symbol} token`, addr: r.stock.address, note: `Tokenized ${r.stock.name}.` });
  }
  return rows;
}

export default function Treasury() {
  const rows = addresses();

  return (
    <>
      <Backdrop />
      <Header />

      <section className="shell" style={{ padding: '60px 30px 40px', position: 'relative', zIndex: 2 }}>
        <Reveal as="h1" className="display h-1" style={{ margin: '0 0 10px' }}>TREASURY</Reveal>
        <Reveal as="p" delay={90} style={{ fontSize: 16.5, color: 'var(--muted)', margin: '0 0 34px', maxWidth: 560 }}>
          Read live from Robinhood Chain every fifteen seconds. Nothing on this page is entered by hand.
        </Reveal>

        <div className="grid-2" style={{ gap: 34, alignItems: 'start' }}>
          <Reveal><LadderStatus /></Reveal>
          <Reveal delay={110}>
            <div className="label" style={{ marginBottom: 12 }}>Every rung</div>
            <LadderRungs />
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- verify */}
      <section className="shell" style={{ padding: '40px 30px 30px', position: 'relative', zIndex: 2 }}>
        <Reveal as="h2" className="display h-2" style={{ margin: '0 0 12px' }}>CHECK IT YOURSELF</Reveal>
        <Reveal as="p" delay={80} style={{ fontSize: 15.5, lineHeight: 1.68, color: 'var(--body)', margin: '0 0 22px', maxWidth: 680 }}>
          You should not take the bar above on faith, and you do not have to. Open the treasury address in an
          explorer and read its token balances. That number and the one on this page come from the same place.
        </Reveal>

        <Reveal delay={120} className="panel mono" style={{ padding: '20px 22px', fontSize: 12.5, lineHeight: 2, color: 'var(--muted)', overflowX: 'auto' }}>
          <div><span style={{ color: 'var(--dim)' }}>$</span> cast call {'<'}stock{'>'} &quot;balanceOf(address)(uint256)&quot; {TREASURY || '<treasury>'} \</div>
          <div style={{ paddingLeft: 22 }}>--rpc-url https://rpc.mainnet.chain.robinhood.com</div>
          <div style={{ color: 'var(--dim)', marginTop: 8 }}>
            {'//'} shares owned = balanceOf × uiMultiplier ÷ 1e18
          </div>
          <div style={{ color: 'var(--dim)' }}>
            {'//'} the multiplier is ERC-8056: it is how splits and dividends land without balances changing
          </div>
        </Reveal>
      </section>

      {/* -------------------------------------------------------- addresses */}
      <section className="shell" style={{ padding: '30px 30px 90px', position: 'relative', zIndex: 2 }}>
        <Reveal as="h2" className="display h-2" style={{ margin: '0 0 18px' }}>ADDRESSES</Reveal>
        <Reveal delay={80} style={{ display: 'grid', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {rows.map((r) => (
            <div key={r.label} style={{ background: 'var(--panel)', padding: '16px 20px' }}>
              <div className="spread" style={{ gap: 14, flexWrap: 'wrap', marginBottom: 5 }}>
                <span className="display" style={{ fontSize: 16 }}>{r.label}</span>
                <a
                  className="mono"
                  href={explorerAddr(r.addr)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11.5, color: 'var(--accent)', wordBreak: 'break-all' }}
                >
                  {r.addr} ↗
                </a>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--dim)' }}>{r.note}</div>
            </div>
          ))}
        </Reveal>

        {!FEE_WALLET && (
          <Reveal delay={140} as="p" style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--dim)', margin: '18px 0 0', maxWidth: 680 }}>
            The wallet that receives creator fees before they are routed is not published. Fees are visible on
            this page only once they reach the treasury, so treat the bar as a record of what arrived rather
            than a live feed of what was earned.
          </Reveal>
        )}
      </section>

      <Footer />
    </>
  );
}
