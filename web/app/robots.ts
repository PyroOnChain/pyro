import type { MetadataRoute } from 'next';

// Required under output: 'export' - the file is generated once at build time.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
  };
}
