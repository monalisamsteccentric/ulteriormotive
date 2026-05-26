"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const supabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase env missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey
  });
};
