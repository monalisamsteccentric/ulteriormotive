"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { supabaseClient } from "@/lib/supabaseClient";

type RevealRequestPanelProps = {
  matchId: string;
  status: string;
  startedAt: string | null;
  playerAUserId: string | null;
  playerBUserId: string | null;
  revealRequestedByUserId: string | null;
  revealRequestedAt: string | null;
  initialNow: number;
};

const MIN_REVEAL_MS = 2 * 60 * 1000;

export function RevealRequestPanel({
  matchId,
  status,
  startedAt,
  playerAUserId,
  playerBUserId,
  revealRequestedByUserId,
  revealRequestedAt,
  initialNow
}: RevealRequestPanelProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(initialNow);
  const [requestedTimeLabel, setRequestedTimeLabel] = useState("");

  useEffect(() => {
    setUserId(localStorage.getItem("hidden_user_id"));
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!revealRequestedAt) {
      setRequestedTimeLabel("");
      return;
    }
    setRequestedTimeLabel(new Date(revealRequestedAt).toLocaleTimeString());
  }, [revealRequestedAt]);

  useEffect(() => {
    const supabase = supabaseClient();
    const channel = supabase
      .channel(`matches:${matchId}`)
      .on("broadcast", { event: "updated" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, router]);

  useEffect(() => {
    if (status === "revealed" || status === "completed") {
      router.push(`/match/${matchId}/reveal`);
    }
  }, [matchId, router, status]);

  const role = useMemo(() => {
    if (!userId) return "audience";
    if (userId === playerAUserId) return "player_a";
    if (userId === playerBUserId) return "player_b";
    return "audience";
  }, [playerAUserId, playerBUserId, userId]);

  const revealElapsedMs = startedAt ? now - new Date(startedAt).getTime() : 0;
  const secondsLeft = Math.max(0, Math.ceil((MIN_REVEAL_MS - revealElapsedMs) / 1000));
  const locked = status !== "live" || secondsLeft > 0;
  const requestedByMe = Boolean(userId && revealRequestedByUserId === userId);
  const requestedByOther = Boolean(userId && revealRequestedByUserId && revealRequestedByUserId !== userId);

  async function submit() {
    if (!userId) {
      setError("Open this match as Player A or Player B to request reveal.");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch(`/api/matches/${matchId}/reveal-request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId })
    });
    const result = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(result?.error ?? "Reveal request failed.");
      return;
    }
    if (result?.status === "revealed") router.push(`/match/${matchId}/reveal`);
    else router.refresh();
  }

  return (
    <section className="rounded-lg border border-line bg-ink p-4">
      <div className="mb-3">
        <h2 className="text-lg font-black">Reveal</h2>
        <p className="mt-1 text-sm font-bold leading-6 text-mist">
          {status === "revealed" || status === "completed"
            ? "Identities are unlocked."
            : secondsLeft > 0
              ? `Reveal unlocks in ${secondsLeft}s.`
              : "Reveal needs approval from both players."}
        </p>
      </div>
      {revealRequestedByUserId ? (
        <div className="mb-3 rounded-lg border border-line bg-panel p-3 text-sm font-bold text-white">
          {requestedByMe ? "You requested reveal. Waiting for the other player." : "The other player requested reveal."}
          {requestedTimeLabel ? <p className="mt-1 text-xs text-mist">Requested {requestedTimeLabel}</p> : null}
        </div>
      ) : null}
      {role === "audience" ? (
        <p className="text-sm font-bold text-mist">Audience can watch and vote, but only players can reveal.</p>
      ) : (
        <Button className="w-full" disabled={busy || locked || requestedByMe} onClick={submit}>
          {requestedByOther ? "Agree and reveal" : requestedByMe ? "Waiting for approval" : "Request reveal"}
        </Button>
      )}
      {error ? <p className="mt-3 text-sm font-bold text-shock">{error}</p> : null}
    </section>
  );
}
