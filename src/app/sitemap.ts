import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { productFor, trustedHost } from '@/lib/routing';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
 const h = await headers();
 const host = h.get('x-um-host') || trustedHost(h), product = productFor(host);
 const base = product ? `https://${host}` : 'https://ulteriormotive.club';
 const paths = product === 'automation' ? ['', '/solution', '/capabilities', '/architecture', '/process', '/pricing', '/about', '/contact'] : product === 'game' ? ['', '/rules'] : [''];
 return paths.map(path => ({ url: base + (path || '/'), changeFrequency: 'weekly' }));
}
