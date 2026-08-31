/**
 * Every metadata record filed for a club, keyed by who signed it.
 * The caller decides which to believe by comparing against creator() on chain.
 */
interface Env {
  IMAGES?: R2Bucket;
}

export const onRequestGet: PagesFunction<Env, 'vault'> = async (ctx) => {
  const bucket = ctx.env.IMAGES;
  if (!bucket) return res({});

  const vault = String(ctx.params.vault).toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(vault)) return res({ error: 'bad_vault' }, 400);

  const listing = await bucket.list({ prefix: `meta/${vault}/`, limit: 25 });
  const out: Record<string, unknown> = {};

  for (const obj of listing.objects) {
    const got = await bucket.get(obj.key);
    if (!got) continue;
    try {
      const rec = JSON.parse(await got.text()) as { signer?: string };
      if (rec.signer) out[rec.signer.toLowerCase()] = rec;
    } catch {
      // skip anything unparseable rather than failing the whole read
    }
  }

  return res({ records: out });
};

function res(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=20' },
  });
}
