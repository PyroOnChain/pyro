'use client';

import { useState } from 'react';

/**
 * Trade and share controls for one side of a fight.
 *
 * The Pons link is the thing worth spreading: it is where someone can actually
 * buy, and buying is what moves the peak and generates the fees the winners
 * collect. Share text names both coins so a post reads as a matchup rather than
 * a bare token shill, and it carries the Pons URL rather than ours so the link
 * lands people one click from a buy.
 */
export const ponsUrl = (token?: string) =>
  token ? `https://www.ponsfamily.com/launchpad/${token}` : '';

export function ShareCoin({
  token, symbol, otherSymbol, side, minsLeft,
}: {
  token?: string;
  symbol?: string;
  otherSymbol?: string;
  side: 'a' | 'b';
  minsLeft?: number;
}) {
  const [copied, setCopied] = useState(false);
  if (!token) return null;

  const url = ponsUrl(token);
  const me = symbol ? `$${symbol}` : 'this side';
  const them = otherSymbol ? `$${otherSymbol}` : 'the other side';
  const clock = minsLeft && minsLeft > 0 ? ` ${minsLeft} min left.` : '';

  const text =
    `${me} vs ${them} on Stock Wars.${clock} `
    + `Whichever side peaks higher takes the creator fees from BOTH coins. `
    + `I'm on ${me}.`;

  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked; the Pons button still gets them there
    }
  };

  const share = async () => {
    // native sheet on phones, X intent everywhere else
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${me} vs ${them}`, text, url });
        return;
      } catch {
        // dismissed, or unsupported despite the check
      }
    }
    window.open(xUrl, '_blank', 'noopener,noreferrer');
  };

  const c = side === 'a' ? 'var(--red)' : 'var(--blue)';

  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      <a href={url} target="_blank" rel="noreferrer noopener" className="chip"
        style={{ borderColor: c, color: c }}>
        BUY ON PONS ↗
      </a>
      <button className="chip" onClick={share} title="Share this matchup">SHARE</button>
      <button className="chip" onClick={copy} title="Copy the Pons link">
        {copied ? 'COPIED' : 'COPY LINK'}
      </button>
    </div>
  );
}
