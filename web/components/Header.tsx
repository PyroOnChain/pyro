'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useCorrectChain } from '@/lib/useCorrectChain';
import { short } from '@/lib/format';

export function Header() {
  const path = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { wrongChain, switching, switchToPyro, walletChainId } = useCorrectChain();

  const nav = [
    { href: '/clubs', label: 'Clubs' },
    { href: '/create', label: 'Create' },
  ];

  return (
    <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)' }}>
      <div className="shell between" style={{ padding: '18px 40px' }}>
        <div className="row" style={{ gap: 34 }}>
          <Link href="/" className="row" style={{ gap: 10, color: 'var(--ink)' }}>
            <Image src="/pyro-logo-dark.png" alt="Pyro" width={40} height={27} style={{ height: 19, width: 'auto' }} priority />
            <span className="display" style={{ fontSize: 18, letterSpacing: '0.14em' }}>PYRO</span>
          </Link>
          <nav className="row hide-sm" style={{ gap: 24, fontSize: 14, fontWeight: 500 }}>
            {nav.map((n) => {
              const active = path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  style={{
                    color: active ? 'var(--ink)' : 'var(--muted)',
                    borderBottom: active ? '2px solid var(--ember)' : '2px solid transparent',
                    paddingBottom: 3,
                  }}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="row" style={{ gap: 10 }}>
          {wrongChain ? (
            <button className="chip btn-primary" style={{ padding: '10px 16px', fontSize: 13 }}
              disabled={switching} onClick={switchToPyro}>
              {switching ? 'CHECK WALLET…' : 'WRONG NETWORK — SWITCH'}
            </button>
          ) : (
            <span className="chip mono hide-sm"
              style={{ border: '1px solid var(--line)', background: 'var(--bg)', padding: '9px 13px', fontSize: 12, color: 'var(--dim)' }}>
              {isConnected ? walletChainId : 4663}
            </span>
          )}

          {isConnected ? (
            <button className="chip row"
              style={{ border: '1px solid var(--line)', background: 'var(--bg)', padding: '9px 14px', gap: 8 }}
              onClick={() => disconnect()} title="Disconnect">
              <span style={{ width: 7, height: 7, background: 'var(--gain)', display: 'block' }} />
              <span className="mono" style={{ fontSize: 12.5 }}>{short(address)}</span>
            </button>
          ) : (
            <button className="chip btn-primary" style={{ padding: '11px 18px', fontSize: 13 }}
              disabled={isPending}
              onClick={() => connect({ connector: connectors[0] })}>
              {isPending ? 'CONNECTING…' : 'CONNECT WALLET'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
