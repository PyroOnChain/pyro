/**
 * Club metadata: the mascot picture and links.
 *
 * The launchpad stores these off-chain and exposes no getter, so there is no
 * way to read a mascot's image back from the chain. We keep our own copy here,
 * beside the image itself, so nothing new is trusted that was not already.
 *
 * Writes are authorised by a signature from the club's creator, checked against
 * creator() on the vault, so nobody can put a picture on somebody else's club.
 */

import { recoverMessageAddress, isAddress, type Address } from 'viem';

interface Env {
  IMAGES?: R2Bucket;
  RPC_URL?: string;
}

const DEFAULT_RPC = 'https://rpc.mainnet.chain.robinhood.com';
const CREATOR_SELECTOR = '0x02d05d3f'; // creator()

export function metaMessage(vault: string, logo: string) {
  return `Pyro club metadata\nvault: ${vault.toLowerCase()}\nlogo: ${logo}`;
}

async function creatorOf(vault: string, rpc: string): Promise<string | null> {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_call',
      params: [{ to: vault, data: CREATOR_SELECTOR }, 'latest'],
    }),
  });
  const j = (await res.json()) as { result?: string };
  if (!j.result || j.result.length < 66) return null;
  return ('0x' + j.result.slice(-40)).toLowerCase();
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const bucket = ctx.env.IMAGES;
  if (!bucket) return json({ error: 'not_configured' }, 501);

  let body: { vault?: string; logo?: string; signature?: string;
              twitter?: string; website?: string; description?: string };
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

  const creator = await creatorOf(vault, ctx.env.RPC_URL || DEFAULT_RPC);
  if (!creator) return json({ error: 'vault_unreadable' }, 400);
  if (creator !== signer.toLowerCase()) return json({ error: 'not_the_creator' }, 403);

  const record = {
    vault: vault.toLowerCase(),
    logo,
    twitter: typeof body.twitter === 'string' ? body.twitter.slice(0, 200) : '',
    website: typeof body.website === 'string' ? body.website.slice(0, 200) : '',
    description: typeof body.description === 'string' ? body.description.slice(0, 300) : '',
    updated: new Date().toISOString(),
  };

  await bucket.put(`meta/${vault.toLowerCase()}.json`, JSON.stringify(record), {
    httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=60' },
  });

  return json(record, 200);
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
