import { headers } from 'next/headers';
import { productFor, trustedHost } from './routing';
export async function canonical(path?: string) {
 const h = await headers(), host = h.get('x-um-host') || trustedHost(h), product = productFor(host);
 const base = product ? `https://${host}` : 'https://ulteriormotive.club';
 let route = path ?? h.get('x-um-path') ?? '/';
 if (product && (route === `/${product}` || route.startsWith(`/${product}/`))) route = route.slice(product.length + 1) || '/';
 return base + route;
}
