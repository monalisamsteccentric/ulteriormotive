export const productHosts = { game: 'game.ulteriormotive.club', automation: 'automation.ulteriormotive.club' } as const;
export function trustedHost(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-host')?.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  const host = headers.get('host')?.toLowerCase().replace(/:\d+$/, '') || '';
  return forwarded && ['ulteriormotive.club', 'www.ulteriormotive.club', ...Object.values(productHosts)].includes(forwarded) ? forwarded : host;
}
export function productFor(host: string) { return host === productHosts.game ? 'game' : host === productHosts.automation ? 'automation' : null; }
export function productPath(path: string, host = typeof window === 'undefined' ? '' : window.location.hostname) {
  const product = productFor(host);
  if (!path.startsWith('/')) return path;
  if (!product) {
    if (['ulteriormotive.club', 'www.ulteriormotive.club'].includes(host)) {
      for (const [name, domain] of Object.entries(productHosts)) if (path === `/${name}` || path.startsWith(`/${name}/`)) return `https://${domain}${path.slice(name.length + 1) || '/'}`;
    }
    return path;
  }
  if (path === '/') return 'https://ulteriormotive.club/';
  for (const [name, domain] of Object.entries(productHosts)) {
    if (path === `/${name}` || path.startsWith(`/${name}/`) || path.startsWith(`/${name}?`)) {
      const tail = path.slice(name.length + 1) || '/';
      return name === product ? tail : `https://${domain}${tail}`;
    }
  }
  return path;
}
