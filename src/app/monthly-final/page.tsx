import Link from "next/link";
import { ChampionshipNotice } from "@/components/championship/ChampionshipNotice";
import { AppShell } from "@/components/layout/AppShell";
import { currentPeriod, getCurrentFinal, getLeaderboard, periodLabel } from "@/lib/championship";

export const dynamic = "force-dynamic";

export default async function MonthlyFinalPage() {
  const period = currentPeriod();
  const [final, leaderboard] = await Promise.all([getCurrentFinal(period), getLeaderboard(period)]);
  const finalistNames = new Map(leaderboard.map((entry) => [entry.user_id, entry.player_name]));

  return (
    <AppShell>
      <section className="mb-4 rounded-lg border border-neon bg-ink p-5">
        <p className="text-sm font-black uppercase text-mist">Monthly Final</p>
        <h1 className="mt-1 text-4xl font-black text-white">{periodLabel(period)}</h1>
        <p className="mt-2 text-base font-bold leading-7 text-mist">
          Final match winner becomes monthly champion. Audience votes are scored by deception, not popularity.
        </p>
      </section>
      <div className="mb-4">
        <ChampionshipNotice />
      </div>
      {final ? (
        <section className="grid gap-4 rounded-lg border border-line bg-ink p-4 md:grid-cols-3">
          <Finalist label="Finalist 1" name={finalistNames.get(final.finalist_one_user_id) ?? final.finalist_one_user_id} />
          <Finalist label="Finalist 2" name={finalistNames.get(final.finalist_two_user_id) ?? final.finalist_two_user_id} />
          <div>
            <p className="text-xs font-black uppercase text-mist">Status</p>
            <p className="mt-1 text-2xl font-black text-neon">{final.status}</p>
            {final.final_match_id ? (
              <Link className="mt-3 inline-flex min-h-12 items-center rounded-lg bg-neon px-4 text-sm font-black text-void" href={`/match/${final.final_match_id}`}>
                Watch final
              </Link>
            ) : (
              <p className="mt-3 text-sm font-bold text-mist">Final match is not linked yet.</p>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-line bg-ink p-4">
          <p className="text-xl font-black text-white">The monthly final has not been scheduled yet.</p>
          <p className="mt-2 text-sm font-bold text-mist">The top 2 players qualify after the leaderboard is frozen.</p>
        </section>
      )}
    </AppShell>
  );
}

function Finalist({ label, name }: { label: string; name: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <p className="text-xs font-black uppercase text-mist">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{name}</p>
    </div>
  );
}
