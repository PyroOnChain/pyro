import Link from 'next/link';
import { BRAND } from '@/lib/config';

export function Header() {
  return (
    <header className="hdr">
      <div className="shell hdr-in">
        <Link href="/" className="mark">
          {/* Plain img: this is a static export with image optimisation off, and
              the mark is a fixed-size asset that never needs a srcset. */}
          <img
            src="/ladder-mark.png"
            alt=""
            width={22}
            height={22}
            style={{ display: 'block', width: 22, height: 'auto' }}
          />
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
