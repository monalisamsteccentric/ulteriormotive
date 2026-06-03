import { ReactNode } from "react";
import { LeaderboardDisplayEntry } from "@/lib/championship";

export function LeaderboardTable({ entries }: { entries: LeaderboardDisplayEntry[] }) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-line bg-ink p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-mist">Rank {entry.rank ?? "-"}</p>
                <h2 className="mt-1 break-words text-xl font-black text-white">{entry.player_name}</h2>
              </div>
              <span className="shrink-0 rounded-lg border border-line bg-panel px-2 py-1 text-xs font-black uppercase text-neon">
                {entry.qualification_status.replace(/_/g, " ")}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Played" value={entry.matches_played} />
              <Stat label="Won" value={entry.matches_won} />
              <Stat label="Deceived" value={entry.total_audience_deceived} />
              <Stat label="Avg deception" value={Number(entry.average_deception_per_match).toFixed(2)} />
            </dl>
            <div className="mt-3 rounded-lg border border-line bg-panel p-3">
              <p className="text-xs font-black uppercase text-mist">Total points</p>
              <p className="mt-1 text-2xl font-black text-white">{entry.total_points}</p>
            </div>
          </article>
        ))}
        {!entries.length ? (
          <section className="rounded-lg border border-line bg-ink p-5">
            <p className="text-base font-bold text-mist">No completed championship matches yet.</p>
          </section>
        ) : null}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-ink md:block">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead className="bg-panel text-xs uppercase text-mist">
          <tr>
            <Th>Rank</Th>
            <Th>Player name</Th>
            <Th>Matches played</Th>
            <Th>Matches won</Th>
            <Th>Total audience deceived</Th>
            <Th>Average deception per match</Th>
            <Th>Total points</Th>
            <Th>Qualification status</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-t border-line">
              <Td>{entry.rank ?? "-"}</Td>
              <Td>{entry.player_name}</Td>
              <Td>{entry.matches_played}</Td>
              <Td>{entry.matches_won}</Td>
              <Td>{entry.total_audience_deceived}</Td>
              <Td>{Number(entry.average_deception_per_match).toFixed(2)}</Td>
              <Td>{entry.total_points}</Td>
              <Td>
                <span className="rounded-lg border border-line bg-panel px-2 py-1 text-xs font-black uppercase text-neon">
                  {entry.qualification_status.replace(/_/g, " ")}
                </span>
              </Td>
            </tr>
          ))}
          {!entries.length ? (
            <tr>
              <Td colSpan={8}>No completed championship matches yet.</Td>
            </tr>
          ) : null}
        </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <dt className="text-xs font-black uppercase text-mist">{label}</dt>
      <dd className="mt-1 text-lg font-black text-white">{value}</dd>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-black">{children}</th>;
}

function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} className="px-4 py-3 font-bold text-white">{children}</td>;
}
