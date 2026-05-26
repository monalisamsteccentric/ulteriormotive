import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

export type SupabaseEnvName = (typeof SUPABASE_ENV_NAMES)[number];

export class MissingSupabaseEnvError extends Error {
  missing: SupabaseEnvName[];

  constructor(missing: SupabaseEnvName[]) {
    super("Missing Supabase server environment variables.");
    this.name = "MissingSupabaseEnvError";
    this.missing = missing;
  }
}

export function getMissingSupabaseEnvNames() {
  return SUPABASE_ENV_NAMES.filter((name) => !process.env[name]);
}

export const hasSupabaseEnv = getMissingSupabaseEnvNames().length === 0;

export const supabaseServer = async () => {
  const cookieStore = await cookies();
  return createServerComponentClient({
    cookies: () => cookieStore as unknown as ReturnType<typeof cookies>
  });
};

export const supabaseAdmin = () => {
  const missing = getMissingSupabaseEnvNames();

  if (missing.length > 0) {
    console.error("Missing Supabase environment variables:", missing);
    throw new MissingSupabaseEnvError(missing);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
