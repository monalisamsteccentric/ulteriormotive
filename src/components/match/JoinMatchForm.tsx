"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
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
  inviteUrl,
  match,
  createdMatchId,
  creatorSeat
}: {
  inviteCode: string;
  inviteUrl: string;
  match: PublicMatch | null;
  createdMatchId: string | null;
  creatorSeat: PlayerRole | null;
}) {
  const router = useRouter();
  const [controlType, setControlType] = useState<ControlType>("human");
  const [username, setUsername] = useState("Guest");
  const [aiStrategy, setAiStrategy] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [editableInviteCode, setEditableInviteCode] = useState(inviteCode);
  const joiningSeat = openSeat(match);
  const isFull = Boolean(match && !joiningSeat);
  const isCreatorView = Boolean(createdMatchId && creatorSeat);

  useEffect(() => {
    setUsername(localStorage.getItem("hidden_username") ?? "Guest");
  }, []);

  useEffect(() => {
    setEditableInviteCode(inviteCode);
  }, [inviteCode]);

  function changeInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextInviteCode = editableInviteCode.replace(/\s+/g, "").toUpperCase();
    if (!nextInviteCode) {
      setError("Enter an invite code.");
      return;
    }
    router.push(`/join/${encodeURIComponent(nextInviteCode)}`);
  }

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

  async function copy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-ink p-4">
        <p className="text-xs font-black uppercase text-mist">Invite</p>
        <p className="text-4xl font-black text-neon">{inviteCode}</p>
        <form onSubmit={changeInvite} className="mt-4 flex gap-2">
          <input
            value={editableInviteCode}
            onChange={(event) => {
              setEditableInviteCode(event.target.value);
              setError("");
            }}
            autoComplete="off"
            aria-label="Edit invite code"
            className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-base font-black uppercase text-white outline-none focus:border-neon sm:text-sm"
          />
          <Button type="submit" variant="ghost">Use code</Button>
        </form>
      </section>
      <section className="grid gap-3 rounded-lg border border-line bg-ink p-4 sm:grid-cols-2">
        <SeatCard label="Player A" state={match?.player_a_user_id ? "Taken" : "Open"} active={joiningSeat === "player_a" || creatorSeat === "player_a"} />
        <SeatCard label="Player B" state={match?.player_b_user_id ? "Taken" : "Open"} active={joiningSeat === "player_b" || creatorSeat === "player_b"} />
      </section>
      <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-xs font-black uppercase text-mist">Your next step</p>
        {isCreatorView ? (
          <>
            <p className="mt-1 text-2xl font-black text-neon">You are {seatLabel(creatorSeat as PlayerRole)}</p>
            <p className="mt-2 text-base font-bold leading-7 text-mist sm:text-sm sm:leading-6">Share this invite, then enter the waiting room. The other player will claim the open seat.</p>
          </>
        ) : joiningSeat ? (
          <>
            <p className="mt-1 text-2xl font-black text-neon">You will join as {seatLabel(joiningSeat)}</p>
            <p className="mt-2 text-base font-bold leading-7 text-mist sm:text-sm sm:leading-6">Choose whether this seat is controlled by you or by AI, then join the match.</p>
          </>
        ) : (
          <>
            <p className="mt-1 text-2xl font-black text-shock">{isFull ? "This match is full" : "Match not found"}</p>
            <p className="mt-2 text-base font-bold leading-7 text-mist sm:text-sm sm:leading-6">Ask the host for a fresh invite if you need to play.</p>
          </>
        )}
      </section>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={copy}>{copied ? "Copied" : "Copy link"}</Button>
        <a className="inline-flex min-h-14 items-center justify-center rounded-lg border border-line bg-panel px-4 text-base font-black sm:min-h-12 sm:text-sm" href={`https://wa.me/?text=${encodeURIComponent(inviteUrl)}`}>WhatsApp</a>
        <Button variant="ghost" onClick={() => navigator.clipboard.writeText(`Can you tell who is human? ${inviteUrl}`)}>Instagram caption</Button>
        <a className="inline-flex min-h-14 items-center justify-center rounded-lg border border-line bg-panel px-4 text-base font-black sm:min-h-12 sm:text-sm" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Can you tell who is human? ${inviteUrl}`)}`}>X / Twitter</a>
        <Button variant="ghost" onClick={() => navigator.share?.({ url: inviteUrl, text: "Join my Ulterior Motive match" })}>Native share</Button>
      </div>
      {isCreatorView ? (
        <Button variant="ghost" className="w-full" onClick={() => router.push(`/match/${createdMatchId}`)}>Enter waiting room</Button>
      ) : null}
      {!isCreatorView && joiningSeat ? (
        <>
      <input className="w-full rounded-lg border border-line bg-panel px-4 py-3 text-base outline-none focus:border-neon" value={username} onChange={(e) => setUsername(e.target.value)} />
      <h2 className="text-base font-black uppercase text-mist sm:text-sm">Do you want to play yourself or let AI play for you?</h2>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setControlType("human")} className={`min-h-14 rounded-lg border px-3 text-base font-black sm:min-h-12 sm:text-sm ${controlType === "human" ? "border-shock bg-shock/20" : "border-line bg-panel text-mist"}`}>Play myself</button>
        <button onClick={() => setControlType("ai")} className={`min-h-14 rounded-lg border px-3 text-base font-black sm:min-h-12 sm:text-sm ${controlType === "ai" ? "border-shock bg-shock/20" : "border-line bg-panel text-mist"}`}>Let AI play</button>
      </div>
      {controlType === "ai" ? (
        <AiStrategyBox value={aiStrategy} onChange={setAiStrategy} />
      ) : null}
      <p className="text-base font-bold leading-7 text-mist sm:text-sm sm:leading-6">Nobody sees that choice until reveal.</p>
      {error ? <p className="text-sm font-bold text-shock">{error}</p> : null}
      <Button className="w-full" onClick={join}>Join match</Button>
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
        placeholder="Tell your AI how to win: what personality to use, what to ask, what details to remember, or how to throw suspicion."
        className="min-h-32 w-full resize-none rounded-lg border border-line bg-panel px-4 py-3 text-base font-bold leading-7 text-white outline-none focus:border-neon sm:min-h-28 sm:text-sm sm:leading-6"
      />
      <p className="mt-1 text-sm font-bold text-mist sm:text-xs">{value.length}/600 private characters</p>
    </section>
  );
}

function SeatCard({ label, state, active }: { label: string; state: string; active: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${active ? "border-neon bg-neon/10" : "border-line bg-panel"}`}>
      <p className="text-xs font-black uppercase text-mist">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{state}</p>
      {active ? <p className="mt-2 text-sm font-black uppercase text-neon sm:text-xs">Your seat</p> : null}
    </div>
  );
}
