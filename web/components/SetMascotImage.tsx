'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import type { Address } from 'viem';
import { ImagePicker } from './ImagePicker';
import { metaMessage } from '@/lib/clubMeta';

/**
 * Lets a club's creator set or replace the mascot picture after the fact.
 * Only rendered for the creator, and the write is authorised by their signature,
 * which the endpoint checks against creator() on the vault.
 */
export function SetMascotImage({
  vault,
  creator,
  hasImage,
}: {
  vault: Address;
  creator?: Address;
  hasImage: boolean;
}) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [open, setOpen] = useState(false);
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isCreator =
    Boolean(address && creator) && address!.toLowerCase() === creator!.toLowerCase();
  if (!isCreator) return null;

  async function save() {
    setErr(null); setBusy(true);
    try {
      const signature = await signMessageAsync({ message: metaMessage(vault, logo.trim()) });
      const res = await fetch('/api/club-meta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vault, logo: logo.trim(), signature }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error === 'not_configured' ? 'Image storage is not switched on.' : 'Could not save that.');
      }
      setDone(true);
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="chip"
        style={{
          border: '1px dashed var(--stroke)', background: 'var(--bg)', color: 'var(--ember-ink)',
          padding: '9px 14px', fontSize: 12.5,
        }}
      >
        {hasImage ? 'Change the mascot picture' : 'Add a mascot picture'}
      </button>
    );
  }

  return (
    <div className="slab card" style={{ padding: 20, maxWidth: 460 }}>
      <div className="display" style={{ fontSize: 15, letterSpacing: '0.04em', marginBottom: 14 }}>
        {hasImage ? 'CHANGE THE PICTURE' : 'ADD A PICTURE'}
      </div>
      <ImagePicker value={logo} onChange={setLogo} />
      <div className="row" style={{ gap: 10, marginTop: 16 }}>
        <button className="btn btn-primary" style={{ padding: '12px 20px', fontSize: 14 }}
          disabled={!logo || busy || done} onClick={save}>
          {done ? 'SAVED' : busy ? 'SIGN IN YOUR WALLET…' : 'SAVE'}
        </button>
        <button className="btn btn-ghost" style={{ padding: '11px 18px', fontSize: 14 }}
          onClick={() => setOpen(false)} disabled={busy}>
          CANCEL
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 11, lineHeight: 1.55 }}>
        Signing costs nothing and sends no transaction. It only proves you opened this club.
      </div>
      {err && <div style={{ fontSize: 12.5, color: 'var(--loss)', marginTop: 9 }}>{err}</div>}
    </div>
  );
}
