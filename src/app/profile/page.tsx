import { AppShell } from "@/components/layout/AppShell";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function ProfilePage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const { data: profile } = user
    ? await supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle()
    : { data: null };
  const username =
    profile?.username ??
    user?.user_metadata?.name ??
    user?.user_metadata?.full_name ??
    "Guest";
  const email = user?.email ?? "Not signed in";
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;

  return (
    <AppShell>
      <section className="rounded-lg border border-line bg-ink p-5">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="mb-4 h-20 w-20 rounded-full border border-neon bg-panel object-cover" />
        ) : (
          <div className="mb-4 grid h-20 w-20 place-items-center rounded-full border border-neon bg-panel text-3xl font-black">
            {username.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-3xl font-black">{username}</h1>
        <p className="mt-2 text-sm font-bold text-mist">{email}</p>
      </section>
      <section className="mt-4 rounded-lg border border-line bg-ink p-5">
        <h2 className="font-black">Match history</h2>
        <p className="mt-2 text-sm font-bold text-mist">Placeholder for completed matches.</p>
      </section>
      <section className="mt-4 rounded-lg border border-line bg-ink p-5">
        <h2 className="font-black">Guess accuracy</h2>
        <p className="mt-2 text-sm font-bold text-mist">Placeholder for vote accuracy stats.</p>
      </section>
    </AppShell>
  );
}
