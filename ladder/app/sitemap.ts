import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/treasury/'].map((path) => ({
    url: `${BRAND.site}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: path === '/' ? 1 : 0.8,
  }));
}
