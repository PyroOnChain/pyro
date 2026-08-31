/** Reads back a club's mascot picture and links. */
interface Env {
  IMAGES?: R2Bucket;
}

export const onRequestGet: PagesFunction<Env, 'vault'> = async (ctx) => {
  const bucket = ctx.env.IMAGES;
  if (!bucket) return new Response('{}', { status: 200, headers: hdrs() });

  const vault = String(ctx.params.vault).toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(vault)) {
    return new Response(JSON.stringify({ error: 'bad_vault' }), { status: 400, headers: hdrs() });
  }

  const obj = await bucket.get(`meta/${vault}.json`);
  if (!obj) return new Response('{}', { status: 200, headers: hdrs() });

  return new Response(obj.body, { status: 200, headers: hdrs() });
};

function hdrs() {
  return {
    'content-type': 'application/json',
    'cache-control': 'public, max-age=30',
  };
}
