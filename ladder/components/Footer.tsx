import { BRAND } from '@/lib/config';

export function Footer() {
  return (
    <footer className="ftr">
      <div className="shell spread" style={{ gap: 20, flexWrap: 'wrap' }}>
        <div className="label">
          {BRAND.name} · {BRAND.tagline}
        </div>
        <div className="row" style={{ gap: 22 }}>
          <a className="label" href={BRAND.x} target="_blank" rel="noreferrer" style={{ color: 'var(--body)' }}>X</a>
          <span className="label">Robinhood Chain · 4663</span>
        </div>
      </div>
      <div className="shell" style={{ marginTop: 22 }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--dim)', margin: 0, maxWidth: 780 }}>
          {BRAND.ticker} is a memecoin. It is not a fund, a share, or a claim on anything, and holding it
          entitles you to nothing. The treasury is a wallet this project controls; nobody can redeem against
          it. Every figure on this site is read live from Robinhood Chain and can be checked against the
          addresses published on the treasury page.
        </p>
      </div>
    </footer>
  );
}
