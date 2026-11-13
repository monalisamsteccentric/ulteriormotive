import { NextResponse, type NextRequest } from 'next/server';
import { productFor, productHosts, trustedHost } from './lib/routing';
export function middleware(req: NextRequest) {
  const host = trustedHost(req.headers), product = productFor(host), path = req.nextUrl.pathname;
  const headers = new Headers(req.headers);
  headers.set('x-um-host', host); headers.set('x-um-path', path);
  if (/^\/(api|_next)(\/|$)/.test(path) || /\.(?:ico|png|jpg|svg|webp|txt|xml)$/.test(path)) return NextResponse.next({ request: { headers } });
  if (product) {
    const other = product === 'game' ? 'automation' : 'game';
    if (path === `/${other}` || path.startsWith(`/${other}/`)) return NextResponse.redirect(new URL(path.slice(other.length + 1) || '/', `https://${productHosts[other]}`));
    if (path === `/${product}` || path.startsWith(`/${product}/`)) {
      const url = req.nextUrl.clone(); url.host = host; url.protocol = 'https:'; url.pathname = path.slice(product.length + 1) || '/';
      return NextResponse.redirect(url);
    }
    const url = req.nextUrl.clone(); url.pathname = `/${product}${path === '/' ? '' : path}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
