import { NextResponse, type NextRequest } from 'next/server';
export function proxy(req: NextRequest) {
  if (process.env.ENABLE_SUBDOMAIN_ROUTING !== 'true') return NextResponse.next();
  const host = req.nextUrl.hostname, path = req.nextUrl.pathname;
  if (/^\/(api|_next)(\/|$)/.test(path) || path.includes('.')) return NextResponse.next();
  const prefix = host === 'automation.ulteriormotive.club' ? '/automation' : host === 'game.ulteriormotive.club' ? '/game' : null;
  if (prefix && !path.startsWith(prefix)) { const url = req.nextUrl.clone(); url.pathname = prefix + (path === '/' ? '' : path); return NextResponse.rewrite(url); }
  return NextResponse.next();
}
