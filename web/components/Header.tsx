'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { WalletPicker } from '@/components/WalletPicker';
import { short } from '@/lib/format';
import { useCorrectChain } from '@/lib/useCorrectChain';
import { LINKS } from '@/lib/links';

/**
 * A floating island rather than a full-width bar.
 *
 * The backdrop is a live canvas, and a solid header cut a hard line across it.
 * Taking the nav out of the flow lets the arena run edge to edge behind it, and
 * the blur keeps the links legible over whatever colour happens to be underneath.
 * Nav labels stay visible at every width: hiding them on phones left the only
 * route between pages a button on the home page.
 */
const nav = [
  { href: '/battles', label: 'Fights' },
  { href: '/start', label: 'Start' },
];

export function Header() {
  const path = usePathname();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { wrongChain, switching, switchToVaultTube: switchChain } = useCorrectChain();

  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="island-wrap">
        <div className={`island${stuck ? ' stuck' : ''}`}>
          <Link href="/" className="row" style={{ gap: 9, whiteSpace: 'nowrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brawlz-mark.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            <span className="display" style={{ fontSize: 17, letterSpacing: '-0.02em' }}>
              BR<span style={{ color: 'var(--a)' }}>A</span>WLZ
            </span>
          </Link>

          <span className="island-sep" />

          <nav className="island-nav">
            {nav.map((n) => (
              <Link key={n.href} href={n.href}
                className={`island-link${path.startsWith(n.href) ? ' on' : ''}`}>
                {n.label}
              </Link>
            ))}
          </nav>

          {LINKS.x && (
            <a href={LINKS.x} target="_blank" rel="noreferrer noopener"
              className="island-link" aria-label="Brawlz on X" title="Brawlz on X"
              style={{ display: 'grid', placeItems: 'center', padding: '9px 11px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.5 6.7L18.9 2Zm-1.1 18.1h1.7L7.3 3.8H5.5l12.3 16.3Z"/>
              </svg>
            </a>
          )}

          {wrongChain ? (
            <button className="btn btn-prize" style={{ padding: '9px 16px', fontSize: 13 }}
              disabled={switching} onClick={switchChain}>
              {switching ? 'Check wallet' : 'Wrong network'}
            </button>
          ) : isConnected ? (
            <button className="btn btn-ghost" style={{ padding: '9px 15px', fontSize: 12.5, fontFamily: 'var(--font-mono)', letterSpacing: 0 }}
              onClick={() => disconnect()} title="Disconnect">
              {short(address)}
            </button>
          ) : (
            <WalletPicker>
              {(open) => (
                <button className="btn btn-prize" style={{ padding: '9px 18px', fontSize: 13 }} onClick={open}>
                  Connect
                </button>
              )}
            </WalletPicker>
          )}
        </div>
      </div>

      {/* the island is fixed, so the flow needs the space back */}
      <div className="island-gap" aria-hidden="true" />
    </>
  );
}
