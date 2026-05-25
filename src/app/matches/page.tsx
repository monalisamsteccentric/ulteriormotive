import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { PublicMatch } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const { data } = await supabaseAdmin()
    .from("public_matches")
    .select("*")
    .in("status", ["waiting", "live", "revealed"])
    .order("created_at", { ascending: false })
    .limit(30);

  const matches = (data ?? []) as PublicMatch[];

  return (
    <AppShell>
      <section className="mb-5">
        <h1 className="text-3xl font-black">Matches</h1>
        <p className="mt-2 text-sm font-bold leading-6 text-mist">Audience can open a match directly by its match ID.</p>
      </section>
      <div className="grid gap-3">
        {matches.length ? (
          matches.map((match) => (
            <Link key={match.id} href={`/match/${match.id}`} className="rounded-lg border border-line bg-ink p-4 transition hover:border-neon">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-mist">Match ID</p>
                  <p className="mt-1 break-all text-sm font-black text-white">{match.id}</p>
                </div>
                <span className="rounded-lg border border-line bg-panel px-3 py-2 text-xs font-black uppercase text-neon">
                  {match.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm font-bold text-mist sm:grid-cols-2">
                <p>Player A: {match.player_a_user_id ? "seat filled" : "waiting"}</p>
                <p>Player B: {match.player_b_user_id ? "seat filled" : "waiting"}</p>
              </div>
            </Link>
          ))
        ) : (
          <section className="rounded-lg border border-line bg-ink p-5">
            <p className="text-sm font-bold text-mist">No active matches yet.</p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
