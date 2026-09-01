'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { short } from '@/lib/format';
import { useCorrectChain } from '@/lib/useCorrectChain';

const nav = [
  { href: '/battles', label: 'Battles' },
  { href: '/start', label: 'Start a fight' },
];

export function Header() {
  const path = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { wrongChain, switching, switchToVaultTube: switchChain } = useCorrectChain();

  return (
    <header style={{ borderBottom: '1px solid var(--line)', background: 'rgba(10,12,18,0.82)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="shell between" style={{ padding: '16px 36px' }}>
        <div className="row" style={{ gap: 30 }}>
          <Link href="/" className="row" style={{ gap: 10 }}>
            <span className="display" style={{ fontSize: 22, letterSpacing: '0.02em' }}>
              STOCK<span style={{ color: 'var(--red)' }}>W</span><span style={{ color: 'var(--blue)' }}>A</span>RS
            </span>
          </Link>
          <nav className="row hide-sm" style={{ gap: 22, fontSize: 14.5, fontWeight: 500 }}>
            {nav.map((n) => (
              <Link key={n.href} href={n.href}
                style={{ color: path.startsWith(n.href) ? 'var(--ink)' : 'var(--muted)' }}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="row" style={{ gap: 10 }}>
          {wrongChain ? (
            <button className="btn btn-gold" style={{ padding: '11px 18px', fontSize: 14 }}
              disabled={switching} onClick={switchChain}>
              {switching ? 'Check wallet…' : 'Wrong network'}
            </button>
          ) : isConnected ? (
            <button className="chip" onClick={() => disconnect()} title="Disconnect">
              {short(address)}
            </button>
          ) : (
            <button className="btn btn-gold" style={{ padding: '11px 20px', fontSize: 14 }}
              disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
              {isPending ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
