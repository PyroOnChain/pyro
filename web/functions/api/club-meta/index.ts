/**
 * Club metadata: the mascot picture and links.
 *
 * The launchpad stores these off-chain and exposes no getter, so a mascot's
 * image cannot be read back from the chain. We keep our own copy beside the
 * image itself, which introduces no trust that was not already there.
 *
 * Authorisation is deliberately NOT done here. This function only verifies
 * that the signature is real and records who signed it; it never asks the
 * chain who owns the club. That matters because the server sits on Cloudflare's
 * shared egress, which the public RPC rate-limits with a blanket 429, and a
 * feature that depends on the server reaching the chain is a feature that
 * breaks whenever that endpoint feels like it.
 *
 * Instead every record is filed under its signer, and the reader decides. The
 * club page already reads creator() from the chain for its own display, so it
 * shows the record signed by that creator and ignores everything else. Anyone
 * can file a record; nobody can make one be believed.
 */

import { recoverMessageAddress, isAddress, type Address } from 'viem';

interface Env {
  IMAGES?: R2Bucket;
}

export function metaMessage(vault: string, logo: string) {
  return `Pyro club metadata\nvault: ${vault.toLowerCase()}\nlogo: ${logo}`;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const bucket = ctx.env.IMAGES;
  if (!bucket) return json({ error: 'not_configured' }, 501);

  let body: {
    vault?: string; logo?: string; signature?: string;
    twitter?: string; website?: string; description?: string;
  };
  try { body = await ctx.request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const { vault, logo, signature } = body;
  if (!vault || !isAddress(vault)) return json({ error: 'bad_vault' }, 400);
  if (!logo || logo.length > 480) return json({ error: 'bad_logo' }, 400);
  if (!signature) return json({ error: 'missing_signature' }, 400);

  let signer: Address;
  try {
    signer = await recoverMessageAddress({
      message: metaMessage(vault, logo),
      signature: signature as `0x${string}`,
    });
  } catch {
    return json({ error: 'bad_signature' }, 400);
  }

  const record = {
    vault: vault.toLowerCase(),
    signer: signer.toLowerCase(),
    logo,
    twitter: str(body.twitter, 200),
    website: str(body.website, 200),
    description: str(body.description, 300),
    updated: new Date().toISOString(),
  };

  // Filed under the signer, so one person's record can never overwrite another's.
  await bucket.put(
    `meta/${vault.toLowerCase()}/${signer.toLowerCase()}.json`,
    JSON.stringify(record),
    { httpMetadata: { contentType: 'application/json' } }
  );

  return json(record, 200);
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
