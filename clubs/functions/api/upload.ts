/**
 * Image upload for mascot launches.
 *
 * The launchpad caps the logo field at 512 characters, so the picture cannot be
 * embedded in the launch itself - it has to live somewhere and be referenced by
 * a short URL. This stores it in R2 and hands back a link served by the sibling
 * function, which avoids needing a public bucket or a second domain.
 *
 * Objects are keyed by the hash of their own bytes, so re-uploading the same
 * image is free and nobody can overwrite someone else's.
 *
 * Requires an R2 bucket bound as IMAGES on the Pages project. Without the
 * binding this returns 501 and the client falls back to pasting a URL.
 */

interface Env {
  IMAGES?: R2Bucket;
}

const MAX_BYTES = 512 * 1024; // the client already compresses to ~10KB; this is a backstop
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const bucket = ctx.env.IMAGES;
  if (!bucket) {
    return json({ error: 'not_configured' }, 501);
  }

  const type = ctx.request.headers.get('content-type') ?? '';
  if (!ALLOWED.has(type)) {
    return json({ error: 'unsupported_type', allowed: [...ALLOWED] }, 415);
  }

  const body = await ctx.request.arrayBuffer();
  if (body.byteLength === 0) return json({ error: 'empty' }, 400);
  if (body.byteLength > MAX_BYTES) return json({ error: 'too_large', max: MAX_BYTES }, 413);

  const digest = await crypto.subtle.digest('SHA-256', body);
  const key = [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const ext = type.split('/')[1].replace('jpeg', 'jpg');
  const name = `${key}.${ext}`;

  // Content-addressed, so an identical upload is a no-op rather than a rewrite.
  if (!(await bucket.head(name))) {
    await bucket.put(name, body, {
      httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
    });
  }

  const url = new URL(ctx.request.url);
  return json({ url: `${url.origin}/api/img/${name}` }, 200);
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
