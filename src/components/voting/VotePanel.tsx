"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VoteChoice, VoteStats } from "@/types/database";
import { Button } from "@/components/common/Button";
import { supabaseClient } from "@/lib/supabaseClient";

const options: { label: string; vote: VoteChoice }[] = [
  { label: "A is AI", vote: "player_a_ai" },
  { label: "B is AI", vote: "player_b_ai" },
  { label: "Both AI", vote: "both_ai" },
  { label: "None AI", vote: "none_ai" }
];

export function VotePanel({ matchId, userId, initialStats }: { matchId: string; userId: string | null; initialStats: VoteStats }) {
  const [stats, setStats] = useState(initialStats);
  const [clientUserId, setClientUserId] = useState(userId);
  const [selected, setSelected] = useState<VoteChoice | null>(null);
  const [error, setError] = useState("");
  const latestStatsRequestRef = useRef(0);

  useEffect(() => {
    latestStatsRequestRef.current += 1;
    setStats(initialStats);
  }, [initialStats]);

  const syncStats = useCallback(async () => {
    const requestId = ++latestStatsRequestRef.current;
    const response = await fetch(`/api/votes?matchId=${encodeURIComponent(matchId)}`, {
      cache: "no-store"
    });
    if (response.ok && requestId === latestStatsRequestRef.current) {
      setStats(await response.json());
    }
  }, [matchId]);

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
    const id = clientUserId ?? localStorage.getItem("hidden_user_id") ?? crypto.randomUUID();
    localStorage.setItem("hidden_user_id", id);
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

  return (
    <section className="rounded-lg border border-line bg-ink p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black">Suspicion</h2>
        <span className="text-xs font-bold text-mist">{stats.totalVotes} votes</span>
      </div>
      <div className="mb-4 grid gap-2 text-sm font-bold">
        <Meter label="Player A" value={stats.playerAIsAiPercent} />
        <Meter label="Player B" value={stats.playerBIsAiPercent} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <Button key={option.vote} type="button" variant={selected === option.vote ? "primary" : "ghost"} onClick={() => submit(option.vote)}>
            {selected === option.vote ? "Voted: " : ""}{option.label}
          </Button>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm font-bold text-shock">{error}</p> : null}
    </section>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-mist">
        <span>{label}</span>
        <span>{value}% AI</span>
      </div>
      <div className="h-2 rounded-full bg-panel">
        <div className="h-2 rounded-full bg-neon" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
