import { footerLinks } from '@/lib/links';

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--band)' }}>
      <div className="shell" style={{ padding: '44px 40px 52px' }}>
        <div className="between" style={{ marginBottom: 34, gap: 60, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 11 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pyro-logo-dark.png" alt="Pyro" style={{ height: 18, width: 'auto', opacity: 0.85 }} />
            <span className="display" style={{ fontSize: 16, letterSpacing: '0.14em', color: 'var(--muted)' }}>PYRO</span>
          </div>
          <div className="row" style={{ gap: 40, fontSize: 14, flexWrap: 'wrap' }}>
            {footerLinks().map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer noopener">
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <p className="mono" style={{ fontSize: 11.5, lineHeight: 1.75, color: 'var(--dim)', margin: 0, maxWidth: 900 }}>
          Tokenized stocks on Robinhood Chain are issued by Robinhood Assets (Jersey) Limited and are debt securities
          tracking the underlying. They do not grant ownership or voting rights in the company. They may not be offered,
          sold or delivered to US persons, and are additionally restricted in the United Kingdom, Canada, Switzerland
          and the UAE. Pyro is unaudited software and you should treat it that way. Nothing here is investment advice.
        </p>
      </div>
    </footer>
  );
}
