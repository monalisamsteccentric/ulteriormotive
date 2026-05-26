import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "./serverConfig";

export const supabaseServer = async () => {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase env missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerComponentClient(
    {
      cookies: () => cookieStore as unknown as ReturnType<typeof cookies>
    },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey
    }
  );
};

export const supabaseAdmin = () => {
  const { supabaseUrl, supabaseServiceRoleKey, missing } = getSupabaseServerConfig();
  if (missing.length > 0 || !supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(`Supabase env missing: ${missing.join(", ")}`);
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
