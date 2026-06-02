import { ReactNode } from "react";
import { LeaderboardDisplayEntry } from "@/lib/championship";

export function LeaderboardTable({ entries }: { entries: LeaderboardDisplayEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-ink">
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
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-black">{children}</th>;
}

function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} className="px-4 py-3 font-bold text-white">{children}</td>;
}
