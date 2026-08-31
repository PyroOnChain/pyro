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

export function useClubMeta(vault?: Address) {
  const [meta, setMeta] = useState<ClubMeta | null>(null);

  useEffect(() => {
    if (!vault) return;
    let live = true;
    fetch(`/api/club-meta/${vault.toLowerCase()}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => { if (live) setMeta(d as ClubMeta); })
      .catch(() => { if (live) setMeta({}); });
    return () => { live = false; };
  }, [vault]);

  return meta;
}
