import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['node:sqlite'],
  async rewrites() {
    // Manifest-level fallback for hosting adapters with middleware limitations.
    const rules = [];
    for (const header of ['host', 'x-forwarded-host']) {
      for (const path of ['', '/login', '/rules', '/matches/:id']) rules.push({ source: path || '/', has: [{ type: 'header' as const, key: header, value: 'game.ulteriormotive.club' }], destination: `/game${path}` });
      for (const path of ['', '/solution', '/capabilities', '/architecture', '/process', '/pricing', '/about', '/contact']) rules.push({ source: path || '/', has: [{ type: 'header' as const, key: header, value: 'automation.ulteriormotive.club' }], destination: `/automation${path}` });
    }
    return { beforeFiles: rules, afterFiles: [], fallback: [] };
  },
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ] }]; },
};
export default config;
