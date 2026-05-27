"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlayerRole, VoteChoice, VoteStats } from "@/types/database";
import { Button } from "@/components/common/Button";
import { supabaseClient } from "@/lib/supabaseClient";

const options: { label: string; vote: VoteChoice }[] = [
  { label: "Both are AI", vote: "both_ai" },
  { label: "Both are human", vote: "none_ai" },
  { label: "A is human, B is AI", vote: "player_b_ai" },
  { label: "B is human, A is AI", vote: "player_a_ai" }
];

type VotePanelProps = {
  matchId: string;
  userId: string | null;
  playerAUserId: string | null;
  playerBUserId: string | null;
  initialStats: VoteStats;
};

type StatsResponse = VoteStats & {
  selectedVote?: VoteChoice | null;
};

export function VotePanel({ matchId, userId, playerAUserId, playerBUserId, initialStats }: VotePanelProps) {
  const searchParams = useSearchParams();
  const forceAudience = searchParams.get("audience") === "1";
  const [stats, setStats] = useState(initialStats);
  const [clientUserId, setClientUserId] = useState(userId);
  const [role, setRole] = useState<PlayerRole | "audience">("audience");
  const [selected, setSelected] = useState<VoteChoice | null>(null);
  const [error, setError] = useState("");
  const latestStatsRequestRef = useRef(0);

  useEffect(() => {
    latestStatsRequestRef.current += 1;
    setStats(initialStats);
  }, [initialStats]);

  const syncStats = useCallback(async () => {
    const requestId = ++latestStatsRequestRef.current;
    const id = clientUserId ?? localStorage.getItem(forceAudience ? "hidden_audience_user_id" : "hidden_user_id");
    const params = new URLSearchParams({ matchId });
    if (id) params.set("voterUserId", id);

    const response = await fetch(`/api/votes?${params.toString()}`, {
      cache: "no-store"
    });
    if (response.ok && requestId === latestStatsRequestRef.current) {
      const result = (await response.json()) as StatsResponse;
      setStats(result);
      if ("selectedVote" in result) setSelected(result.selectedVote ?? null);
    }
  }, [clientUserId, forceAudience, matchId]);

  useEffect(() => {
    let id = clientUserId;
    if (!id) {
      id = localStorage.getItem(forceAudience ? "hidden_audience_user_id" : "hidden_user_id");
      if (id) setClientUserId(id);
    }
    setRole(forceAudience ? "audience" : id === playerAUserId ? "player_a" : id === playerBUserId ? "player_b" : "audience");
  }, [clientUserId, forceAudience, playerAUserId, playerBUserId]);

  useEffect(() => {
    syncStats();
    const id = window.setInterval(syncStats, 5000);
    return () => window.clearInterval(id);
  }, [syncStats]);

  useEffect(() => {
    const supabase = supabaseClient();
    const channel = supabase
      .channel(`votes:${matchId}`)
      .on("broadcast", { event: "stats" }, (payload) => {
        latestStatsRequestRef.current += 1;
        setStats(payload.payload as VoteStats);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  async function submit(vote: VoteChoice) {
    const storageKey = forceAudience ? "hidden_audience_user_id" : "hidden_user_id";
    const id = clientUserId ?? localStorage.getItem(storageKey) ?? crypto.randomUUID();
    localStorage.setItem(storageKey, id);
    setClientUserId(id);
    setError("");
    const response = await fetch("/api/votes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId, voterUserId: id, vote })
    });
    if (response.ok) {
      latestStatsRequestRef.current += 1;
      setSelected(vote);
      setStats(await response.json());
    } else {
      const result = await response.json().catch(() => null);
      setError(result?.error ?? "Vote failed.");
    }
  }

  const playerGuessOptions =
    role === "player_a"
      ? [
          { label: "Player B is Human", vote: "none_ai" as const },
          { label: "Player B is AI", vote: "player_b_ai" as const }
        ]
      : role === "player_b"
        ? [
            { label: "Player A is Human", vote: "none_ai" as const },
            { label: "Player A is AI", vote: "player_a_ai" as const }
          ]
        : null;
  const title = playerGuessOptions ? "Score guess" : "Suspicion";
  const subtitle = playerGuessOptions
    ? "Guess your opposite player. Correct: +30%. Wrong: -30%."
    : "Vote on who is AI.";

  return (
    <section className="rounded-lg border border-line bg-ink p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black sm:text-lg">{title}</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-mist sm:text-xs sm:leading-normal">{subtitle}</p>
        </div>
        <span className="text-sm font-bold text-mist sm:text-xs">{stats.totalVotes} votes</span>
      </div>
      {playerGuessOptions ? (
        <div className="mb-4 grid gap-2">
          {playerGuessOptions.map((option) => (
            <Button key={option.vote} type="button" variant={selected === option.vote ? "primary" : "ghost"} onClick={() => submit(option.vote)}>
              {selected === option.vote ? "Saved: " : ""}{option.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {options.map((option) => (
            <Button key={option.vote} type="button" variant={selected === option.vote ? "primary" : "ghost"} onClick={() => submit(option.vote)}>
              {selected === option.vote ? "Voted: " : ""}{option.label}
            </Button>
          ))}
        </div>
      )}
      <div className="mb-4 grid gap-3 text-base font-bold sm:gap-2 sm:text-sm">
        <Meter label="Player A" value={stats.playerAIsAiPercent} />
        <Meter label="Player B" value={stats.playerBIsAiPercent} />
      </div>
      {error ? <p className="mt-3 text-sm font-bold text-shock">{error}</p> : null}
    </section>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-mist sm:mb-1">
        <span>{label}</span>
        <span>{value}% AI</span>
      </div>
      <div className="h-3 rounded-full bg-panel sm:h-2">
        <div className="h-3 rounded-full bg-neon sm:h-2" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
