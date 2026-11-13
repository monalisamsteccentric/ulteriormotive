// Explicit operator-only inspection. This prints personal inquiry data to YOUR terminal; do not publish its output.
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
if (existsSync(resolve('.env.local'))) process.loadEnvFile(resolve('.env.local'));
if (process.env.DATA_BACKEND === 'supabase') throw new Error('Use the Supabase dashboard under operator credentials to inspect um_app_state.data.inquiries. No public inquiry endpoint exists.');
const path = resolve(process.env.DATABASE_PATH || '.local/ulterior.sqlite');
if (!existsSync(path)) { console.log('No local database yet. Start the app and submit a contact inquiry first.'); process.exit(0); }
const db = new DatabaseSync(path, { readOnly: true });
try {
  const row = db.prepare('SELECT data FROM um_state WHERE id=1').get();
  const inquiries = JSON.parse(row.data).inquiries;
  console.log(JSON.stringify(inquiries, null, 2));
} finally { db.close(); }
