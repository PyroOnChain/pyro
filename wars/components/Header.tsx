'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { short } from '@/lib/format';
import { useCorrectChain } from '@/lib/useCorrectChain';

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
  const { connect, connectors, isPending } = useConnect();
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
          <Link href="/" className="display" style={{ fontSize: 17, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            STOCK<span style={{ color: 'var(--red)' }}>W</span><span style={{ color: 'var(--blue)' }}>A</span>RS
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

          {wrongChain ? (
            <button className="btn btn-gold" style={{ padding: '9px 16px', fontSize: 13 }}
              disabled={switching} onClick={switchChain}>
              {switching ? 'Check wallet' : 'Wrong network'}
            </button>
          ) : isConnected ? (
            <button className="btn btn-ghost" style={{ padding: '9px 15px', fontSize: 12.5, fontFamily: 'var(--font-mono)', letterSpacing: 0 }}
              onClick={() => disconnect()} title="Disconnect">
              {short(address)}
            </button>
          ) : (
            <button className="btn btn-gold" style={{ padding: '9px 18px', fontSize: 13 }}
              disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
              {isPending ? 'Connecting' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* the island is fixed, so the flow needs the space back */}
      <div className="island-gap" aria-hidden="true" />
    </>
  );
}
