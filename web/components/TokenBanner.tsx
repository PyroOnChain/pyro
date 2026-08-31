'use client';

import { useState } from 'react';
import { ponsTokenUrl } from '@/lib/clubMeta';

/**
 * The project's own coin.
 *
 * Deliberately its own band rather than part of the mechanism sections: $PYRO
 * trades against ETH and its fees do not feed any club vault, so putting it
 * beside the "fees become stock" copy would read as a claim that buying it
 * grows the jars. It does not.
 */
export function TokenBanner({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked; the address is on screen and selectable anyway.
    }
  };

  return (
    <div style={{ background: 'var(--ink)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div className="shell" style={{ padding: '38px 40px' }}>
        <div className="between stack-sm" style={{ gap: 26 }}>
          <div>
            <div className="row" style={{ gap: 10, marginBottom: 12 }}>
              <span className="pulse-dot" style={{ width: 7, height: 7, background: 'var(--ember)', display: 'block' }} />
              <span className="mono" style={{ fontSize: 12, letterSpacing: '0.18em', color: '#A79C90' }}>
                OUR OFFICIAL TOKEN IS LIVE
              </span>
            </div>

            <div className="row" style={{ gap: 14, marginBottom: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <span className="display" style={{ fontSize: 30, color: 'var(--bg)', letterSpacing: '0.03em' }}>
                $PYRO
              </span>
              <span style={{ fontSize: 15, color: '#A79C90' }}>Pyro Clubz</span>
            </div>

            <button
              onClick={copy}
              className="chip mono"
              title="Copy the contract address"
              style={{
                background: '#241E1A', border: '1px solid #3A322C', color: '#E8DFD6',
                padding: '11px 14px', fontSize: 12.5, textAlign: 'left', maxWidth: '100%',
                overflowWrap: 'anywhere', cursor: 'pointer',
              }}
            >
              {copied ? 'copied to clipboard' : address}
            </button>

            <p style={{ fontSize: 13, color: '#8A7F74', margin: '14px 0 0', maxWidth: 520, lineHeight: 1.6 }}>
              Always check the address before you buy. $PYRO trades against ETH and is the
              project&apos;s own coin, separate from the club vaults, whose fees come from their own
              mascots.
            </p>
          </div>

          <a
            href={ponsTokenUrl(address)}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-primary"
            style={{ display: 'inline-block', padding: '18px 36px', fontSize: 16, flexShrink: 0 }}
          >
            BUY $PYRO ON PONS
          </a>
        </div>
      </div>
    </div>
  );
}
