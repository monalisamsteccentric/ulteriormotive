export function getSupabaseServerConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing: string[] = [];

  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    missing
  };
}
