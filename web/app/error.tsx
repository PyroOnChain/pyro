'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Last line of defence. Without this a render error shows a blank white page, which on a
 * finance site reads as "the money is gone" rather than "a component threw".
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="shell" style={{ padding: '110px 40px 130px', textAlign: 'center' }}>
      <div className="mono" style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--dim)', marginBottom: 18 }}>
        SOMETHING BROKE
      </div>
      <h1 className="display h-1" style={{ margin: '0 0 16px', lineHeight: 1.05 }}>
        THAT DID NOT LOAD.
      </h1>
      <p style={{ fontSize: 17, color: 'var(--muted)', margin: '0 auto 12px', maxWidth: 470 }}>
        The page failed to render. Your funds are untouched by this: nothing here moves tokens,
        it only reads them.
      </p>
      {error.digest && (
        <p className="mono" style={{ fontSize: 12, color: 'var(--dim)', margin: '0 auto 34px' }}>
          reference {error.digest}
        </p>
      )}
      <div className="row" style={{ justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
        <button className="btn btn-primary" onClick={reset}>TRY AGAIN</button>
        <Link href="/clubs" className="btn btn-ghost" style={{ display: 'inline-block', color: 'var(--ink)' }}>BROWSE CLUBS</Link>
      </div>
    </div>
  );
}
