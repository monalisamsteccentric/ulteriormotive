import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseUrl() {
  return process.env["NEXT_PUBLIC_SUPABASE_URL"] as string;
}

export function getSupabaseAnonKey() {
  return process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] as string;
}

export function getSupabaseServiceRoleKey() {
  return process.env["SUPABASE_SERVICE_ROLE_KEY"] as string;
}

export const supabaseServer = async () => {
  const cookieStore = await cookies();
  return createServerComponentClient(
    {
      cookies: () => cookieStore as unknown as ReturnType<typeof cookies>
    },
    {
      supabaseUrl: getSupabaseUrl(),
      supabaseKey: getSupabaseAnonKey()
    }
  );
};

export const supabaseAdmin = () => {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
