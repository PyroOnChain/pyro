'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnect } from 'wagmi';

/**
 * Lets the user choose which wallet to connect.
 *
 * wagmi discovers every injected extension through EIP-6963, so a browser with
 * MetaMask, Zerion and Phantom installed exposes three connectors. Connecting to
 * connectors[0] hands the user whichever one registered first, which is arbitrary
 * and, in practice, wrong: it opened Zerion's onboarding for someone trying to use
 * MetaMask. Ask instead. With exactly one wallet present this stays out of the way
 * and connects straight through.
 */
export function WalletPicker({ children }: { children: (open: () => void) => React.ReactNode }) {
  const { connect, connectors, isPending } = useConnect();
  const [open, setOpen] = useState(false);

  const wallets = useMemo(() => {
    const seen = new Set<string>();
    const unique = connectors.filter((c) => {
      const key = (c.name || c.id).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // The generic "Injected" entry duplicates a discovered wallet whenever one
    // announced itself, so only fall back to it if nothing else is there.
    const named = unique.filter((c) => c.id !== 'injected');
    return named.length > 0 ? named : unique;
  }, [connectors]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const start = () => {
    if (isPending) return;
    if (wallets.length === 1) connect({ connector: wallets[0] });
    else setOpen(true);
  };

  return (
    <>
      {children(start)}

      {open && (
        <>
          <div className="picker-scrim" onClick={() => setOpen(false)} />
          <div className="picker" role="dialog" aria-label="Choose a wallet">
            <div className="between" style={{ padding: '2px 8px 12px' }}>
              <span className="label">CHOOSE A WALLET</span>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: 18, lineHeight: 1 }}
                aria-label="Close">×</button>
            </div>

            {wallets.map((c) => (
              <button key={c.uid} className="picker-item"
                onClick={() => { connect({ connector: c }); setOpen(false); }}>
                {c.icon
                  ? <img src={c.icon} alt="" />
                  : <span className="picker-fallback">{(c.name || '?').slice(0, 1)}</span>}
                <span>{c.name}</span>
              </button>
            ))}

            {wallets.length === 0 && (
              <div style={{ padding: '14px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                No wallet extension found. Install MetaMask, then reload this page.
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
