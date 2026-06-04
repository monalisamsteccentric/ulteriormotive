"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/common/Button";
import { ControlType, PlayerRole, PublicMatch } from "@/types/database";

function seatLabel(role: PlayerRole) {
  return role === "player_a" ? "Player A" : "Player B";
}

function openSeat(match: PublicMatch | null): PlayerRole | null {
  if (!match) return null;
  if (!match.player_a_user_id) return "player_a";
  if (!match.player_b_user_id) return "player_b";
  return null;
}

export function JoinMatchForm({
  inviteCode,
  match,
  createdMatchId,
  creatorSeat
}: {
  inviteCode: string;
  match: PublicMatch | null;
  createdMatchId: string | null;
  creatorSeat: PlayerRole | null;
}) {
  const router = useRouter();
  const [controlType, setControlType] = useState<ControlType>("human");
  const [username, setUsername] = useState("Guest");
  const [aiStrategy, setAiStrategy] = useState("");
  const [error, setError] = useState("");
  const joiningSeat = openSeat(match);
  const isFull = Boolean(match && !joiningSeat);
  const isCreatorView = Boolean(createdMatchId && creatorSeat);

  useEffect(() => {
    setUsername(localStorage.getItem("hidden_username") ?? "Guest");
  }, []);

  async function join() {
    const userId = localStorage.getItem("hidden_user_id") ?? crypto.randomUUID();
    localStorage.setItem("hidden_user_id", userId);
    localStorage.setItem("hidden_username", username);
    const response = await fetch(`/api/join/${inviteCode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, controlType, aiStrategy })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error ?? "Could not join this match.");
      return;
    }
    const match = await response.json();
    router.push(`/match/${match.id}`);
  }

  if (!match || isFull) {
    return (
      <section className="space-y-4 rounded-lg border border-line bg-ink p-5">
        <p className="text-xs font-black uppercase text-mist">Invite {inviteCode}</p>
        <h2 className="text-2xl font-black text-shock">{isFull ? "Match full" : "Match not found"}</h2>
        <p className="text-base font-bold leading-7 text-mist sm:text-sm sm:leading-6">
          {isFull ? "Both seats are already claimed." : "Check the invite code and try again."}
        </p>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-line bg-ink p-5 shadow-glow">
      <div>
        <p className="text-xs font-black uppercase text-mist">Invite {inviteCode}</p>
        <h2 className="mt-1 text-2xl font-black text-neon">
          {isCreatorView ? `You are ${seatLabel(creatorSeat as PlayerRole)}` : `Join as ${seatLabel(joiningSeat as PlayerRole)}`}
        </h2>
      </div>
      {isCreatorView ? (
        <Button className="w-full" onClick={() => router.push(`/match/${createdMatchId}`)}>Enter Waiting Room</Button>
      ) : null}
      {!isCreatorView && joiningSeat ? (
        <>
          <input
            className="w-full rounded-lg border border-line bg-panel px-4 py-4 text-base font-bold text-white outline-none focus:border-neon"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <section>
            <h2 className="mb-2 text-base font-black uppercase text-mist sm:text-sm">Who Controls This Player?</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => setControlType("human")} className={`min-h-16 rounded-lg border px-3 text-base font-black sm:min-h-14 sm:text-sm ${controlType === "human" ? "border-shock bg-shock/25 text-white shadow-glow" : "border-line bg-panel text-mist"}`}>{"\uD83D\uDC64"} Play Myself</button>
              <button onClick={() => setControlType("ai")} className={`min-h-16 rounded-lg border px-3 text-base font-black sm:min-h-14 sm:text-sm ${controlType === "ai" ? "border-shock bg-shock/25 text-white shadow-glow" : "border-line bg-panel text-mist"}`}>{"\uD83E\uDD16"} Let AI Play</button>
            </div>
          </section>
          {controlType === "ai" ? (
            <AiStrategyBox value={aiStrategy} onChange={setAiStrategy} />
          ) : null}
          {error ? <p className="text-sm font-bold text-shock">{error}</p> : null}
          <Button className="w-full text-lg sm:text-base" onClick={join}>Enter Game</Button>
        </>
      ) : null}
    </div>
  );
}

function AiStrategyBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-black uppercase text-mist sm:text-sm">AI battle notes</h2>
      <textarea
        value={value}
        maxLength={600}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Give your AI private tactics: how to sound, what to ask, what to avoid, or how to confuse the other player."
        className="min-h-32 w-full resize-none rounded-lg border border-line bg-panel px-4 py-3 text-base font-bold leading-7 text-white outline-none focus:border-neon sm:min-h-28 sm:text-sm sm:leading-6"
      />
      <p className="mt-1 text-sm font-bold text-mist sm:text-xs">{value.length}/600 private characters</p>
    </section>
  );
}

