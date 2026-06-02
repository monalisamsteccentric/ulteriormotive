import { AppShell } from "@/components/layout/AppShell";
import { getPastChampions, periodLabel } from "@/lib/championship";

export const dynamic = "force-dynamic";

export default async function PastChampionsPage() {
  const champions = await getPastChampions();

  return (
    <AppShell>
      <div className="mb-5">
        <p className="text-sm font-black uppercase text-mist">Past Champions</p>
        <h1 className="mt-1 text-4xl font-black text-white">Monthly Champions</h1>
      </div>
      <div className="grid gap-3">
        {champions.map((champion) => (
          <section key={champion.id} className="rounded-lg border border-line bg-ink p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-mist">{periodLabel({ month: champion.month, year: champion.year })}</p>
                <p className="mt-1 text-2xl font-black text-white">{champion.champion_name}</p>
                <p className="mt-1 text-sm font-bold text-mist">Runner up: {champion.runner_up_name}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-black uppercase text-mist">Prize</p>
                <p className="mt-1 text-xl font-black text-neon">₹{champion.prize_amount}</p>
                <p className="text-sm font-black uppercase text-mist">{champion.prize_status}</p>
              </div>
            </div>
            {champion.admin_note ? <p className="mt-3 text-sm font-bold text-mist">{champion.admin_note}</p> : null}
          </section>
        ))}
        {!champions.length ? (
          <section className="rounded-lg border border-line bg-ink p-4">
            <p className="text-xl font-black text-white">No champions have been finalized yet.</p>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
