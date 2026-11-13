import type { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { State } from './types';

export const emptyState = (): State => ({ users: [], sessions: {}, matches: [], inquiries: [], rates: {} });
let local: DatabaseSync | undefined;
let remote: SupabaseClient | undefined;
export function backend() {
  const mode = process.env.DATA_BACKEND || 'local';
  if (!['local', 'supabase'].includes(mode)) throw new Error('Invalid DATA_BACKEND.');
  return mode;
}
export function supabase(publicKey = false) {
  const url = process.env.SUPABASE_URL, key = publicKey ? process.env.SUPABASE_ANON_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured. Set the documented server environment variables.');
  if (publicKey) return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  remote ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return remote;
}
function db() {
  if (!local) {
    const path = resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH || '.local/ulterior.sqlite');
    mkdirSync(dirname(path), { recursive: true });
    // Loaded lazily so the Supabase backend never requires node:sqlite (hosted runtimes may lack it).
    const { DatabaseSync: Sqlite } = process.getBuiltinModule('node:sqlite');
    local = new Sqlite(path); local.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    local.exec('CREATE TABLE IF NOT EXISTS um_state(id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, data TEXT NOT NULL)');
    local.prepare('INSERT OR IGNORE INTO um_state(id,version,data) VALUES(1,1,?)').run(JSON.stringify(emptyState()));
  }
  return local;
}
async function snapshot(): Promise<{ version: number; data: State }> {
  if (backend() === 'local') {
    const row = db().prepare('SELECT version,data FROM um_state WHERE id=1').get() as { version: number; data: string };
    return { version: row.version, data: JSON.parse(row.data) as State };
  }
  const { data, error } = await supabase().from('um_app_state').select('version,data').eq('id', 1).single();
  if (error) throw new Error('Supabase state unavailable. Apply the additive migration and verify service-role access.');
  return data as { version: number; data: State };
}
export async function readState() { return (await snapshot()).data; }
/** Whole-state compare-and-swap makes match/vote/session/contact updates atomic in both implementations. */
export async function mutate<T>(fn: (state: State) => T): Promise<T> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const row = await snapshot();
    const result = fn(row.data);
    if (backend() === 'local') {
      const changed = db().prepare('UPDATE um_state SET data=?,version=version+1 WHERE id=1 AND version=?').run(JSON.stringify(row.data), row.version);
      if (Number(changed.changes) === 1) return result;
    } else {
      const { data, error } = await supabase().from('um_app_state').update({ data: row.data, version: row.version + 1 }).eq('id', 1).eq('version', row.version).select('version');
      if (error) throw new Error('Could not save application state.');
      if (data?.length === 1) return result;
    }
  }
  throw new Error('The room is busy. Please retry your action.');
}
