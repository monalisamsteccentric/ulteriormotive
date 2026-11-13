import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { productFor, trustedHost } from '@/lib/routing';
export const dynamic = 'force-dynamic';
export default async function robots(): Promise<MetadataRoute.Robots> {
 const h = await headers();
 const host = h.get('x-um-host') || trustedHost(h), product = productFor(host);
 const base = product ? `https://${host}` : 'https://ulteriormotive.club';
 if (host.endsWith('.amplifyapp.com') || ['localhost','127.0.0.1'].includes(host)) return { rules: { userAgent: '*', disallow: '/' } };
 return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/login', '/matches/', '/game/login', '/game/matches/'] }, sitemap: `${base}/sitemap.xml` };
}
