import { supabaseServer } from "./supabaseServer";

export async function requireAdmin() {
  const auth = await supabaseServer();
  const { data } = await auth.auth.getUser();
  if (!data.user) throw new Error("Unauthorized");

  const { data: profile } = await auth.from("profiles").select("is_admin").eq("id", data.user.id).single();
  if (!profile?.is_admin) throw new Error("Forbidden");
}
