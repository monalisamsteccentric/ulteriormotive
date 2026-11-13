import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { backend, mutate, readState, supabase } from '@/lib/store';
import { currentUser, hashToken, passwordHash, passwordMatches, publicUser, rate, sessionFor, tokenFrom } from '@/lib/auth';
import { addMessage, createMatch, finishIfDue, GameError, joinMatch, openVoting, viewMatch, vote } from '@/lib/game';
import { aiAvailable, botReply } from '@/lib/opponent';
import type { User } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const credentials = z.object({ email: z.email().max(254).transform((v) => v.trim().toLowerCase()), password: z.string().min(12).max(200), name: z.string().trim().min(2).max(40).optional() }).strict();
const origin = () => process.env.APP_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://game.ulteriormotive.club' : 'http://127.0.0.1:3100');
const secureCookie = () => process.env.NODE_ENV === 'production' || origin().startsWith('https:');
function response(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } }); }
async function json(req: Request): Promise<unknown> {
  if (!req.headers.get('content-type')?.includes('application/json')) throw new GameError('JSON content required.', 415);
  const reader = req.body?.getReader(); if (!reader) throw new GameError('Request body required.');
  let length = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > 16384) { await reader.cancel(); throw new GameError('Request is too large.', 413); } chunks.push(chunk.value); }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new GameError('Invalid JSON.'); }
}
async function requireUser(req: Request) { const u = await currentUser(req); if (!u) throw new GameError('Sign in to continue.', 401); return u; }
async function handle(req: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const path = (await context.params).path, route = path.join('/');
    if (req.method === 'POST') {
      const allowed = new Set((process.env.APP_ORIGINS || [origin(), 'https://ulteriormotive.club', 'https://www.ulteriormotive.club', 'https://game.ulteriormotive.club', 'https://automation.ulteriormotive.club'].join(',')).split(',').map((v) => v.trim()).filter(Boolean));
      if (process.env.NODE_ENV !== 'production' && !process.env.APP_ORIGIN) allowed.add('http://localhost:3100');
      if (!allowed.has(req.headers.get('origin') || '')) throw new GameError('Request origin rejected.', 403);
    }
    if (req.method === 'GET' && route === 'auth/me') return response({ user: publicUser(await currentUser(req)), backend: backend(), aiMode: aiAvailable() ? 'openai' : process.env.AI_MODE === 'ollama' ? 'ollama' : 'practice' });
    if (req.method === 'POST' && ['auth/login', 'auth/register'].includes(route)) {
      const input = credentials.parse(await json(req));
      await mutate((s) => { rate(s, `auth:${hashToken(input.email)}`, 12, 900000); rate(s, 'auth:server', 200, 3600000); });
      let user: User, providerToken: string | undefined, providerExpiry: number | undefined, refreshToken: string | undefined;
      if (backend() === 'supabase') {
        const client = supabase(true);
        const result = route === 'auth/register' ? await client.auth.signUp({ email: input.email, password: input.password, options: { data: { display_name: input.name || 'Observer' } } }) : await client.auth.signInWithPassword({ email: input.email, password: input.password });
        if (result.error || !result.data.user) throw new GameError('Could not authenticate. Check your details and email verification.', 401);
        if (!result.data.session) return response({ confirmationRequired: true, message: 'Check your email to confirm your account, then sign in.' });
        user = { id: result.data.user.id, email: result.data.user.email || input.email, name: String(result.data.user.user_metadata.display_name || input.name || 'Observer').slice(0, 40) };
        providerToken = result.data.session.access_token; providerExpiry = result.data.session.expires_at; refreshToken = result.data.session.refresh_token;
        await mutate((s) => { if (!s.users.some((v) => v.id === user.id)) s.users.push(user); });
      } else if (route === 'auth/register') {
        if (!input.name) throw new GameError('Choose a display name.');
        user = { id: randomUUID(), email: input.email, name: input.name, passwordHash: await passwordHash(input.password) };
        await mutate((s) => { if (s.users.some((v) => v.email === user.email)) throw new GameError('Could not create this account. Try signing in.', 409); s.users.push(user); });
      } else {
        const found = (await readState()).users.find((v) => v.email === input.email);
        if (!await passwordMatches(input.password, found?.passwordHash) || !found) throw new GameError('Incorrect email or password.', 401);
        user = found;
      }
      const session = await sessionFor(user.id, providerToken, providerExpiry, refreshToken);
      const r = response({ user: publicUser(user) });
      r.cookies.set('um_session', session.token, { httpOnly: true, sameSite: 'strict', secure: secureCookie(), path: '/', expires: new Date(session.expiresAt) });
      return r;
    }
    if (req.method === 'POST' && route === 'auth/logout') {
      const token = tokenFrom(req);
      const session = (await readState()).sessions[hashToken(token)];
      await mutate((s) => { delete s.sessions[hashToken(token)]; });
      if (backend() === 'supabase' && session?.providerToken) await supabase().auth.admin.signOut(session.providerToken, 'local').catch(() => undefined);
      const r = response({ ok: true }); r.cookies.set('um_session', '', { httpOnly: true, sameSite: 'strict', secure: secureCookie(), path: '/', expires: new Date(0) }); return r;
    }
    if (req.method === 'POST' && route === 'contact') {
      const input = z.object({ name: z.string().trim().min(2).max(100), email: z.email().max(254), company: z.string().trim().min(2).max(150), message: z.string().trim().min(20).max(5000), role: z.string().trim().min(2).max(150), requirements: z.string().trim().min(20).max(5000), website: z.string().max(0).default('') }).strict().parse(await json(req));
      const id = randomUUID();
      await mutate((s) => { rate(s, `contact:${hashToken(input.email.toLowerCase())}`, 3, 3600000); rate(s, 'contact:server', 30, 3600000); s.inquiries.push({ id, name: input.name, email: input.email, company: input.company, message: input.message, role: input.role, requirements: input.requirements, at: Date.now() }); });
      return response({ id, message: 'Your inquiry has been saved for review. Email delivery is not configured; this confirmation does not mean an email was sent.' }, 201);
    }
    if (req.method === 'GET' && route === 'matches') {
      const user = await currentUser(req), state = await readState();
      return response({ matches: state.matches.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 100).map((m) => viewMatch(m, user?.id)) });
    }
    if (req.method === 'POST' && route === 'matches') {
      const user = await requireUser(req);
      const input = z.object({ title: z.string().trim().min(3).max(80), topic: z.string().trim().min(10).max(240), opponent: z.enum(['human', 'practice', 'ollama', 'ai']) }).strict().parse(await json(req));
      if (input.opponent === 'ollama' && process.env.AI_MODE !== 'ollama') throw new GameError('Configure the local language model before creating an AI match. Practice mode is available without it.');
      if (input.opponent === 'ai' && !aiAvailable()) throw new GameError('AI matches require AI_MODE=openai, OPENAI_MODEL and OPENAI_API_KEY.', 503);
      const match = createMatch(user.id, input.title, input.topic, input.opponent);
      await mutate((s) => { rate(s, `create:${user.id}`, 20, 3600000); s.matches.push(match); });
      let warning: string | undefined;
      try { await botReply(match.id); } catch { warning = 'Room created. The AI is unavailable; use Retry opponent.'; }
      const created = (await readState()).matches.find(v => v.id === match.id)!;
      return response({ match: viewMatch(created, user.id), warning }, 201);
    }
    if (path[0] === 'matches' && path[1]) {
      const id = z.uuid().parse(path[1]);
      if (req.method === 'GET' && path.length === 2) {
        const user = await currentUser(req), state = await readState(); let m = state.matches.find((v) => v.id === id);
        if (!m) throw new GameError('This room could not be found.', 404);
        if (m.status === 'voting' && m.votingEndsAt !== null && m.votingEndsAt <= Date.now()) {
          m = await mutate((s) => { const match = s.matches.find((v) => v.id === id)!; finishIfDue(match); return match; });
        }
        return response({ match: viewMatch(m, user?.id) });
      }
      if (req.method === 'POST' && path.length === 3 && ['join', 'message', 'vote', 'open-voting', 'retry-opponent'].includes(path[2])) {
        const user = await requireUser(req), action = path[2], body = await json(req);
        const match = await mutate((s) => {
          rate(s, `action:${user.id}`, 80, 60000);
          const m = s.matches.find((v) => v.id === id); if (!m) throw new GameError('Room not found.', 404);
          if (action === 'join') { z.object({}).strict().parse(body); joinMatch(m, user.id); }
          if (action === 'message') { const data = z.object({ text: z.string().trim().min(1).max(1500), id: z.uuid() }).strict().parse(body); addMessage(m, user.id, data.text, data.id); }
          if (action === 'vote') { const data = z.object({ choice: z.enum(['human', 'ai', 'a', 'b']) }).strict().parse(body); vote(m, user.id, data.choice); }
          if (action === 'open-voting') { z.object({}).strict().parse(body); if (m.hostId !== user.id) throw new GameError('Only the host can open voting.', 403); openVoting(m); }
          if (action === 'retry-opponent') { z.object({}).strict().parse(body); if (m.hostId !== user.id || m.opponent === 'human') throw new GameError('Only the host can retry the practice/model opponent.', 403); }
          return m;
        });
        if (action === 'message' || action === 'retry-opponent') await botReply(id);
        const updated = (await readState()).matches.find((m) => m.id === id) || match;
        return response({ match: viewMatch(updated, user.id) });
      }
    }
    return response({ error: 'Not found.' }, 404);
  } catch (error) {
    if (error instanceof z.ZodError) return response({ error: error.issues.map(issue => `${issue.path.join('.') || 'Request'}: ${issue.message}`).join('; '), fields: error.flatten().fieldErrors }, 400);
    if (error instanceof GameError) return response({ error: error.message }, error.status);
    console.error('Application request failed:', error instanceof Error ? error.message : 'unknown');
    return response({ error: 'The service could not complete this request. Please retry or check server configuration.' }, 500);
  }
}
export const GET = handle;
export const POST = handle;
