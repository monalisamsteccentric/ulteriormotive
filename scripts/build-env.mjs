// Amplify SSR requires a server environment file. Never print its contents.
import { writeFileSync } from 'node:fs';
const names = ['APP_ORIGIN','APP_ORIGINS','DATA_BACKEND','SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','AI_MODE','OPENAI_API_KEY','OPENAI_MODEL'];
if (process.env.DATA_BACKEND !== 'supabase') throw new Error('Amplify must use DATA_BACKEND=supabase; local SQLite is for development only.');
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || new URL(url).hostname !== 'woyxnowfyhiedyplcspb.supabase.co') throw new Error('Expected the existing ulteriormotive Supabase project.');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) throw new Error('Missing Supabase server keys.');
if (process.env.AI_MODE === 'openai' && (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)) throw new Error('AI mode requires an API key and explicit model.');
writeFileSync('.env.production', names.filter(name => process.env[name]).map(name => `${name}=${JSON.stringify(process.env[name])}`).join('\n') + '\n', { mode: 0o600 });
console.log('Prepared allowlisted SSR environment (values withheld).');
