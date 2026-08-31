/** Serves an uploaded mascot image straight out of R2, cached hard. */
interface Env {
  IMAGES?: R2Bucket;
}

export const onRequestGet: PagesFunction<Env, 'name'> = async (ctx) => {
  const bucket = ctx.env.IMAGES;
  if (!bucket) return new Response('not configured', { status: 501 });

  const name = String(ctx.params.name);
  if (!/^[0-9a-f]{32}\.(png|jpg|webp|gif)$/.test(name)) {
    return new Response('bad name', { status: 400 });
  }

  const obj = await bucket.get(name);
  if (!obj) return new Response('not found', { status: 404 });

  return new Response(obj.body, {
    headers: {
      'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
};
