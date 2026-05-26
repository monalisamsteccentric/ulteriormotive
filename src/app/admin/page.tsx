import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await supabaseServer();
  const { data: userData } = await auth.auth.getUser();
  if (!userData.user) {
    return (
      <AppShell>
        <h1 className="text-3xl font-black">Admin locked</h1>
        <p className="mt-2 text-sm font-bold text-mist">Log in with an admin profile to continue.</p>
      </AppShell>
    );
  }

  const supabase = await supabaseServer();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userData.user.id).single();
  if (!profile?.is_admin) {
    return (
      <AppShell>
        <h1 className="text-3xl font-black">Access denied</h1>
      </AppShell>
    );
  }

  const { data: matches } = await supabase.from("public_matches").select("*").order("created_at", { ascending: false }).limit(20);

  return (
    <AppShell>
      <h1 className="mb-4 text-3xl font-black">Admin</h1>
      <section className="mb-4 rounded-lg border border-line bg-ink p-4">
        <p className="text-sm font-bold text-mist">Protect this route with the profiles.is_admin policy before production traffic.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button variant="ghost">Ban user placeholder</Button>
          <Button variant="ghost">Join secretly placeholder</Button>
        </div>
      </section>
      <div className="space-y-3">
        {(matches ?? []).map((match) => (
          <section key={match.id} className="rounded-lg border border-line bg-ink p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black">{match.invite_code}</p>
                <p className="text-sm font-bold text-mist">{match.status}</p>
              </div>
              <div className="grid gap-2">
                <form action={`/api/admin/matches/${match.id}/start`} method="post"><Button variant="ghost">Force start</Button></form>
                <form action={`/api/admin/matches/${match.id}/reveal`} method="post"><Button variant="ghost">Force reveal</Button></form>
                <form action={`/api/admin/matches/${match.id}/inject-ai`} method="post"><Button variant="danger">Inject AI</Button></form>
              </div>
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
