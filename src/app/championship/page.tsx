import Link from "next/link";
import { ChampionshipNotice } from "@/components/championship/ChampionshipNotice";
import { LeaderboardTable } from "@/components/championship/LeaderboardTable";
import { AppShell } from "@/components/layout/AppShell";
import { currentPeriod, getCurrentFinal, getLeaderboard, periodLabel } from "@/lib/championship";

export const dynamic = "force-dynamic";

export default async function ChampionshipPage() {
  const period = currentPeriod();
  const [entries, final] = await Promise.all([getLeaderboard(period), getCurrentFinal(period)]);

  return (
    <AppShell>
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div>
          <p className="text-sm font-black uppercase text-mist">Championship</p>
          <h1 className="mt-1 text-4xl font-black text-white">{periodLabel(period)}</h1>
          <p className="mt-2 max-w-3xl text-base font-bold leading-7 text-mist">
            Regular matches feed the monthly leaderboard. The leaderboard only decides who reaches the final.
          </p>
        </div>
        <section className="rounded-lg border border-line bg-ink p-4">
          <p className="text-xs font-black uppercase text-mist">Final match</p>
          <p className="mt-1 text-2xl font-black text-neon">{final ? final.status : "Not scheduled"}</p>
          {final?.final_match_id ? (
            <Link className="mt-3 inline-flex min-h-12 items-center rounded-lg bg-neon px-4 text-sm font-black text-void" href={`/match/${final.final_match_id}`}>
              Open final match
            </Link>
          ) : (
            <Link className="mt-3 inline-flex min-h-12 items-center rounded-lg border border-line bg-panel px-4 text-sm font-black text-white" href="/monthly-final">
              View final page
            </Link>
          )}
        </section>
      </div>
      <div className="mb-4">
        <ChampionshipNotice />
      </div>
      <LeaderboardTable entries={entries} />
    </AppShell>
  );
}
