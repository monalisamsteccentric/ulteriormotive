import { ChampionshipNotice } from "@/components/championship/ChampionshipNotice";
import { LeaderboardTable } from "@/components/championship/LeaderboardTable";
import { AppShell } from "@/components/layout/AppShell";
import { currentPeriod, getCurrentFinal, getLeaderboard, getPastChampions, periodLabel } from "@/lib/championship";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function AdminChampionshipPage() {
  const auth = await supabaseServer();
  const { data: userData } = await auth.auth.getUser();
  if (!userData.user) {
    return (
      <AppShell>
        <h1 className="text-3xl font-black">Admin locked</h1>
      </AppShell>
    );
  }

  const { data: profile } = await auth.from("profiles").select("is_admin").eq("id", userData.user.id).single();
  if (!profile?.is_admin) {
    return (
      <AppShell>
        <h1 className="text-3xl font-black">Access denied</h1>
      </AppShell>
    );
  }

  const period = currentPeriod();
  const [entries, final, champions] = await Promise.all([getLeaderboard(period), getCurrentFinal(period), getPastChampions(1)]);
  const latestChampion = champions.find((champion) => champion.month === period.month && champion.year === period.year);

  return (
    <AppShell>
      <div className="mb-5">
        <p className="text-sm font-black uppercase text-mist">Admin Championship</p>
        <h1 className="mt-1 text-4xl font-black text-white">{periodLabel(period)}</h1>
      </div>
      <div className="mb-4">
        <ChampionshipNotice />
      </div>
      <section className="mb-4 grid gap-3 rounded-lg border border-line bg-ink p-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminForm action="freeze" label="Freeze leaderboard" />
        <AdminForm action="schedule_final" label="Create/schedule final match" />
        <form action="/api/admin/championship" method="post" className="grid gap-2 rounded-lg border border-line bg-panel p-3">
          <input type="hidden" name="action" value="finalize" />
          <HiddenPeriod period={period} />
          <input name="championUserId" placeholder="Champion user id (optional)" className="rounded-lg border border-line bg-ink px-3 py-2 text-sm font-bold text-white outline-none focus:border-neon" />
          <input name="runnerUpUserId" placeholder="Runner-up user id (optional)" className="rounded-lg border border-line bg-ink px-3 py-2 text-sm font-bold text-white outline-none focus:border-neon" />
          <textarea name="adminNote" placeholder="Payment/admin notes" className="min-h-20 rounded-lg border border-line bg-ink px-3 py-2 text-sm font-bold text-white outline-none focus:border-neon" />
          <button className="min-h-12 rounded-lg bg-neon px-3 text-sm font-black text-void">Finalize final match winner</button>
        </form>
        <form action="/api/admin/championship" method="post" className="grid gap-2 rounded-lg border border-line bg-panel p-3">
          <input type="hidden" name="action" value="disqualify" />
          <HiddenPeriod period={period} />
          <input name="userId" placeholder="Suspicious user id" className="rounded-lg border border-line bg-ink px-3 py-2 text-sm font-bold text-white outline-none focus:border-neon" />
          <button className="min-h-12 rounded-lg bg-shock px-3 text-sm font-black text-white">Disqualify suspicious user</button>
        </form>
      </section>
      <section className="mb-4 rounded-lg border border-line bg-ink p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-mist">Monthly final</p>
            <p className="mt-1 text-2xl font-black text-white">{final ? final.status : "Not scheduled"}</p>
            <p className="mt-1 text-sm font-bold text-mist">Final match: {final?.final_match_id ?? "none"}</p>
          </div>
          <form action="/api/admin/championship" method="post" className="flex flex-wrap gap-2">
            <input type="hidden" name="action" value="prize" />
            <HiddenPeriod period={period} />
            <select name="prizeStatus" defaultValue={latestChampion?.prize_status ?? "unpaid"} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-black text-white">
              <option value="unpaid">unpaid</option>
              <option value="paid">paid</option>
            </select>
            <input name="adminNote" placeholder="Payment/admin notes" className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-bold text-white outline-none focus:border-neon" />
            <button className="min-h-12 rounded-lg bg-neon px-3 text-sm font-black text-void">Mark prize as paid/unpaid</button>
          </form>
        </div>
      </section>
      <LeaderboardTable entries={entries} />
    </AppShell>
  );
}

function AdminForm({ action, label }: { action: string; label: string }) {
  const period = currentPeriod();
  return (
    <form action="/api/admin/championship" method="post" className="rounded-lg border border-line bg-panel p-3">
      <input type="hidden" name="action" value={action} />
      <HiddenPeriod period={period} />
      <button className="min-h-12 w-full rounded-lg bg-neon px-3 text-sm font-black text-void">{label}</button>
    </form>
  );
}

function HiddenPeriod({ period }: { period: { month: number; year: number } }) {
  return (
    <>
      <input type="hidden" name="month" value={period.month} />
      <input type="hidden" name="year" value={period.year} />
    </>
  );
}
