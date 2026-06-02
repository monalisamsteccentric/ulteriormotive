import { ChampionshipNotice } from "@/components/championship/ChampionshipNotice";
import { LeaderboardTable } from "@/components/championship/LeaderboardTable";
import { AppShell } from "@/components/layout/AppShell";
import { currentPeriod, getLeaderboard, periodLabel } from "@/lib/championship";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const period = currentPeriod();
  const entries = await getLeaderboard(period);

  return (
    <AppShell>
      <div className="mb-5">
        <p className="text-sm font-black uppercase text-mist">Monthly Leaderboard</p>
        <h1 className="mt-1 text-4xl font-black text-white">{periodLabel(period)}</h1>
      </div>
      <div className="mb-4">
        <ChampionshipNotice />
      </div>
      <LeaderboardTable entries={entries} />
    </AppShell>
  );
}
