// =============================================================================
// /sitemap.xml — generated dynamically by Next.js App Router.
// =============================================================================
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://topbuilderai.com';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/custom`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/security`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
