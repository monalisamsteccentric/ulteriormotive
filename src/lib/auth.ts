import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { State, User } from './types';
import { backend, mutate, readState, supabase } from './store';
import { GameError } from './game';
const scrypt = promisify(scryptCallback);
export const hashToken = (s: string) => createHash('sha256').update(s).digest('hex');
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const result = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${result.toString('hex')}`;
}
export async function passwordMatches(password: string, stored?: string) {
  const [salt, hex] = (stored || '00000000000000000000000000000000:' + '00'.repeat(64)).split(':');
  const result = await scrypt(password, salt, 64) as Buffer, expected = Buffer.from(hex, 'hex');
  return expected.length === result.length && timingSafeEqual(expected, result);
}
export function rate(state: State, key: string, max: number, windowMs: number) {
  const now = Date.now(), entry = state.rates[key];
  if (!entry || entry.start + windowMs <= now) state.rates[key] = { start: now, count: 1 };
  else if (entry.count >= max) throw new GameError('Too many attempts. Please try again later.', 429);
  else entry.count++;
  for (const [k, v] of Object.entries(state.rates)) if (v.start < now - 86400000) delete state.rates[k];
}
export function tokenFrom(req: Request) { return req.headers.get('cookie')?.split(';').map((p) => p.trim()).find((p) => p.startsWith('um_session='))?.slice(11) || ''; }
export async function currentUser(req: Request): Promise<User | null> {
  const token = tokenFrom(req); if (!token) return null;
  const key = hashToken(token);
  let state = await readState(), session = state.sessions[key];
  if (!session || session.expiresAt <= Date.now()) return null;
  if (backend() === 'supabase') {
    if (!session.providerToken) return null;
    if ((session.providerExpiresAt || 0) <= Date.now() + 60000) {
      if (!session.refreshToken) return null;
      const refresh = await mutate(s => {
        const current = s.sessions[key];
        if (!current || current.expiresAt <= Date.now() || (current.providerExpiresAt || 0) > Date.now() + 60000 || (current.refreshingUntil || 0) > Date.now()) return null;
        current.refreshingUntil = Date.now() + 15000;
        return current.refreshToken;
      });
      if (refresh) {
        const { data, error } = await supabase(true).auth.refreshSession({ refresh_token: refresh });
        await mutate(s => {
          const current = s.sessions[key]; if (!current || current.refreshToken !== refresh) return;
          if (error || !data.session || data.user?.id !== current.userId) { delete s.sessions[key]; return; }
          current.providerToken = data.session.access_token; current.refreshToken = data.session.refresh_token;
          current.providerExpiresAt = (data.session.expires_at || 0) * 1000; delete current.refreshingUntil;
        });
      } else {
        for (let i = 0; i < 50; i++) {
          const latest = (await readState()).sessions[key];
          if (!latest || !latest.refreshingUntil || latest.refreshingUntil <= Date.now()) break;
          await new Promise(r => setTimeout(r, 100));
        }
      }
      state = await readState(); session = state.sessions[key];
      if (!session || (session.providerExpiresAt || 0) <= Date.now()) return null;
    }
    const { data, error } = await supabase(true).auth.getUser(session.providerToken);
    if (error || data.user?.id !== session.userId) return null;
  }
  return state.users.find(u => u.id === session.userId) || null;
}
export async function sessionFor(userId: string, providerToken?: string, providerExpiry?: number, refreshToken?: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + 7 * 86400000;
  await mutate(s => {
    for (const [k, v] of Object.entries(s.sessions)) if (v.expiresAt <= Date.now()) delete s.sessions[k];
    s.sessions[hashToken(token)] = { userId, expiresAt, providerToken, refreshToken, providerExpiresAt: providerExpiry ? providerExpiry * 1000 : undefined };
  });
  return { token, expiresAt };
}
export const publicUser = (u: User | null) => u ? { id: u.id, name: u.name, email: u.email } : null;
