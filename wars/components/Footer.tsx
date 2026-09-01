export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', marginTop: 80 }}>
      <div className="shell" style={{ padding: '38px 36px 52px' }}>
        <div className="between" style={{ marginBottom: 26, flexWrap: 'wrap', gap: 20 }}>
          <span className="display" style={{ fontSize: 19, color: 'var(--muted)' }}>
            STOCK<span style={{ color: 'var(--red)' }}>W</span><span style={{ color: 'var(--blue)' }}>A</span>RS
          </span>
          <span className="label">Robinhood Chain · 4663</span>
        </div>
        <p className="mono" style={{ fontSize: 11.5, lineHeight: 1.8, color: 'var(--dim)', margin: 0, maxWidth: 940 }}>
          Tokenized stocks on Robinhood Chain are issued by Robinhood Assets (Jersey) Limited and are debt securities
          tracking the underlying. They do not grant ownership or voting rights. They may not be offered, sold or
          delivered to US persons, and are additionally restricted in the United Kingdom, Canada, Switzerland and the
          UAE. Memecoins launched here are worth nothing by design and most will go to zero. Stock Wars is unaudited
          software and you should treat it that way. Nothing here is investment advice.
        </p>
      </div>
    </footer>
  );
}
