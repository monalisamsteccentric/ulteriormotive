"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/common/Button";
import { supabaseClient } from "@/lib/supabaseClient";
import { PublicMatch } from "@/types/database";

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
  const searchParams = useSearchParams();
  const forceAudience = searchParams.get("audience") === "1";
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(initialNow);
  const [requestedTimeLabel, setRequestedTimeLabel] = useState("");
  const [alertDismissed, setAlertDismissed] = useState(false);

  const syncMatchStatus = useCallback(async () => {
    const response = await fetch(`/api/matches/${matchId}`, { cache: "no-store" });
    if (!response.ok) return;

    const match = (await response.json()) as PublicMatch;
    if (match.status === "revealed" || match.status === "completed") {
      router.push(`/match/${matchId}/reveal`);
      return;
    }

    if (
      match.reveal_requested_by_user_id !== revealRequestedByUserId ||
      match.reveal_requested_at !== revealRequestedAt
    ) {
      router.refresh();
    }
  }, [matchId, revealRequestedAt, revealRequestedByUserId, router]);

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
        syncMatchStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, syncMatchStatus]);

  useEffect(() => {
    const id = window.setInterval(syncMatchStatus, 3000);
    return () => window.clearInterval(id);
  }, [syncMatchStatus]);

  useEffect(() => {
    if (status === "revealed" || status === "completed") {
      router.push(`/match/${matchId}/reveal`);
    }
  }, [matchId, router, status]);

  const role = useMemo(() => {
    if (!userId || forceAudience) return "audience";
    if (userId === playerAUserId) return "player_a";
    if (userId === playerBUserId) return "player_b";
    return "audience";
  }, [forceAudience, playerAUserId, playerBUserId, userId]);

  const revealElapsedMs = startedAt ? now - new Date(startedAt).getTime() : 0;
  const secondsLeft = Math.max(0, Math.ceil((MIN_REVEAL_MS - revealElapsedMs) / 1000));
  const locked = status !== "live" || secondsLeft > 0;
  const requestedByMe = Boolean(userId && revealRequestedByUserId === userId);
  const requestedByOther = Boolean(role !== "audience" && userId && revealRequestedByUserId && revealRequestedByUserId !== userId);

  useEffect(() => {
    if (requestedByOther) setAlertDismissed(false);
  }, [revealRequestedByUserId, requestedByOther]);

  function scrollToRevealPanel() {
    document.getElementById("reveal-request-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

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
    <section id="reveal-request-panel" className="rounded-lg border border-line bg-ink p-4">
      {requestedByOther && !alertDismissed ? (
        <div className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-md rounded-lg border border-neon/70 bg-void/95 p-4 shadow-glow backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neon text-void">
              <BellRing size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-white sm:text-sm">Reveal Truth was requested by the other player.</p>
              <p className="mt-1 text-sm font-bold leading-6 text-mist sm:text-xs sm:leading-5">
                Scroll down to accept the request and expose the identities.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button type="button" onClick={scrollToRevealPanel}>Go to Reveal Truth</Button>
                <Button type="button" variant="ghost" onClick={() => setAlertDismissed(true)}>Dismiss</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mb-3">
        <p className="text-xs font-black uppercase text-neon">Reveal requests</p>
        <h2 className="mt-1 text-2xl font-black sm:text-xl">Reveal Truth</h2>
        <p className="mt-1 text-base font-bold leading-7 text-mist sm:text-sm sm:leading-6">
          {status === "revealed" || status === "completed"
            ? "Identities are unlocked."
            : secondsLeft > 0
              ? `Reveal unlocks in ${secondsLeft}s.`
              : "Request a reveal when you think you've solved the match."}
        </p>
      </div>
      {revealRequestedByUserId ? (
        <div className="mb-3 rounded-lg border border-line bg-panel p-3 text-base font-bold leading-7 text-white sm:text-sm sm:leading-normal">
          {requestedByMe ? "You requested Reveal Truth. Waiting for the other player." : "The other player requested Reveal Truth."}
          {requestedTimeLabel ? <p className="mt-1 text-sm text-mist sm:text-xs">Requested {requestedTimeLabel}</p> : null}
        </div>
      ) : null}
      {role === "audience" ? (
        <p className="text-base font-bold leading-7 text-mist sm:text-sm sm:leading-6">Audience can watch and vote, but only players can trigger Reveal Truth.</p>
      ) : (
        <Button className="w-full" disabled={busy || locked || requestedByMe} onClick={submit}>
          {requestedByOther ? "Agree and Reveal Truth" : requestedByMe ? "Waiting for approval" : "Reveal Truth"}
        </Button>
      )}
      {error ? <p className="mt-3 text-sm font-bold text-shock">{error}</p> : null}
    </section>
  );
}
