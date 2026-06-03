"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/common/Button";
import { ControlType, PlayerRole } from "@/types/database";

export function CreateMatchForm() {
  const router = useRouter();
  const [role, setRole] = useState<PlayerRole>("player_a");
  const [controlType, setControlType] = useState<ControlType>("human");
  const [waitMinutes, setWaitMinutes] = useState<5 | 30 | 60>(5);
  const [username, setUsername] = useState("Guest");
  const [aiStrategy, setAiStrategy] = useState("");
  const [error, setError] = useState("");

  async function create() {
    const userId = localStorage.getItem("hidden_user_id") ?? crypto.randomUUID();
    localStorage.setItem("hidden_user_id", userId);
    localStorage.setItem("hidden_username", username);
    const response = await fetch("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, role, controlType, waitMinutes, aiStrategy })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error ?? "Could not create match.");
      return;
    }
    const match = await response.json();
    router.push(`/join/${match.invite_code}?created=${match.id}`);
  }

  return (
    <div className="rounded-lg border border-line bg-ink/90 p-4 shadow-glow backdrop-blur sm:p-6">
      <div className="grid gap-5">
        <label className="block">
          <span className="text-sm font-black uppercase text-mist">Your display name</span>
          <input
            className="mt-2 w-full rounded-lg border border-line bg-panel px-4 py-4 text-lg font-bold text-white outline-none focus:border-neon"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
        </label>
        <Choice title="Choose Your Public Identity" options={[["player_a", "Player A"], ["player_b", "Player B"]]} value={role} onChange={(v) => setRole(v as PlayerRole)} />
        <Choice title="Who Controls This Player?" options={[["human", "\uD83D\uDC64 Play Myself"], ["ai", "\uD83E\uDD16 Let AI Play"]]} value={controlType} onChange={(v) => setControlType(v as ControlType)} />
        {controlType === "ai" ? (
          <AiStrategyBox value={aiStrategy} onChange={setAiStrategy} />
        ) : null}
        <p className="rounded-lg border border-neon/40 bg-neon/10 p-4 text-base font-bold leading-7 text-white">
          The audience will only see Player A and Player B. Your control choice remains hidden until reveal.
        </p>
        <Choice title="How long should we wait for a challenger?" options={[["5", "5 min"], ["30", "30 min"], ["60", "1 hour"]]} value={String(waitMinutes)} onChange={(v) => setWaitMinutes(Number(v) as 5 | 30 | 60)} />
        {error ? <p className="text-sm font-bold text-shock">{error}</p> : null}
        <Button className="w-full text-lg sm:text-base" onClick={create}>Create Invite</Button>
      </div>
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

function Choice({ title, options, value, onChange }: { title: string; options: [string, string][]; value: string; onChange: (value: string) => void }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-black uppercase text-mist sm:text-sm">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(([option, label]) => (
          <button key={option} onClick={() => onChange(option)} className={`min-h-16 rounded-lg border px-4 text-base font-black transition sm:min-h-14 sm:text-sm ${value === option ? "border-shock bg-shock/25 text-white shadow-glow" : "border-line bg-panel text-mist hover:border-white/45"}`}>
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
