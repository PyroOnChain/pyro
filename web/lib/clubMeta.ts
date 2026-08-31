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
  return `Pyro club metadata\nvault: ${vault.toLowerCase()}\nlogo: ${logo}`;
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
