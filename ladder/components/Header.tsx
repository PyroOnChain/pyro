import Link from 'next/link';
import { BRAND } from '@/lib/config';

export function Header() {
  return (
    <header className="hdr">
      <div className="shell hdr-in">
        <Link href="/" className="mark">
          <span className="dot" style={{ background: 'var(--green)' }} />
          <span className="glyph">{BRAND.name}</span>
        </Link>
        <nav>
          <Link href="/treasury">Treasury</Link>
          <Link href="/#how">How it works</Link>
          {BRAND.x && <a href={BRAND.x} target="_blank" rel="noreferrer">X</a>}
        </nav>
        <Link href="/treasury" className="btn btn-primary">See the ladder</Link>
      </div>
    </header>
  );
}
