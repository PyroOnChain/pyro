'use client';

import { useEffect, useState } from 'react';
import type { Address } from 'viem';

export type ClubMeta = {
  logo?: string;
  twitter?: string;
  website?: string;
  description?: string;
};

/** The message a club creator signs to claim their club's metadata. */
export function metaMessage(vault: string, logo: string) {
  return `VaultTube club metadata\nvault: ${vault.toLowerCase()}\nlogo: ${logo}`;
}

/** Where to buy a mascot. Verified: this route returns 200 on the launchpad. */
export const ponsTokenUrl = (mascot: string) =>
  `https://www.ponsfamily.com/launchpad/${mascot}`;

/**
 * Metadata is only believed when it was signed by the club's creator, and that
 * check happens here rather than on the server. The page already reads
 * creator() from the chain for its own display, so it is the right place to
 * decide: anyone may file a record, only the creator's is ever shown.
 */
export function useClubMeta(vault?: Address, creator?: Address) {
  const [meta, setMeta] = useState<ClubMeta | null>(null);

  useEffect(() => {
    if (!vault || !creator) return;
    let live = true;
    fetch(`/api/club-meta/${vault.toLowerCase()}`)
      .then((r) => (r.ok ? r.json() : { records: {} }))
      .then((d) => {
        if (!live) return;
        const records = (d as { records?: Record<string, ClubMeta> }).records ?? {};
        setMeta(records[creator.toLowerCase()] ?? {});
      })
      .catch(() => { if (live) setMeta({}); });
    return () => { live = false; };
  }, [vault, creator]);

  return meta;
}

/**
 * Metadata for many clubs at once, for the list view. Same rule as the single
 * version: a record only counts when its signer matches that club's on-chain
 * creator, so the check stays with the reader.
 */
export function useClubMetas(
  clubs: { address: Address; creator?: Address }[]
): Record<string, ClubMeta> {
  const [metas, setMetas] = useState<Record<string, ClubMeta>>({});

  // Only refetch when the actual set of clubs changes, not on every render.
  const fingerprint = clubs
    .map((c) => `${c.address.toLowerCase()}:${(c.creator ?? '').toLowerCase()}`)
    .sort()
    .join(',');

  useEffect(() => {
    const list = fingerprint ? fingerprint.split(',') : [];
    if (!list.length) return;
    let live = true;

    Promise.all(
      list.map(async (entry) => {
        const [vault, creator] = entry.split(':');
        if (!vault || !creator) return null;
        try {
          const r = await fetch(`/api/club-meta/${vault}`);
          if (!r.ok) return null;
          const d = (await r.json()) as { records?: Record<string, ClubMeta> };
          const rec = d.records?.[creator];
          return rec ? ([vault, rec] as const) : null;
        } catch {
          return null;
        }
      })
    ).then((pairs) => {
      if (!live) return;
      setMetas(Object.fromEntries(pairs.filter(Boolean) as [string, ClubMeta][]));
    });

    return () => { live = false; };
  }, [fingerprint]);

  return metas;
}
