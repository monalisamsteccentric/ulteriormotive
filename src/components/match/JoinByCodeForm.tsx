"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/common/Button";

export function JoinByCodeForm() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedInviteCode = inviteCode.replace(/\s+/g, "").toUpperCase();
    if (!normalizedInviteCode) {
      setError("Enter a match ID.");
      return;
    }
    router.push(`/join/${encodeURIComponent(normalizedInviteCode)}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-ink p-5 shadow-glow">
      <label className="block">
        <span className="text-sm font-black uppercase text-neon sm:text-xs">Invite code</span>
        <p className="mt-1 text-base font-bold leading-7 text-mist">Enter the code and claim the open seat before the reveal clock starts.</p>
        <input
          value={inviteCode}
          onChange={(event) => {
            setInviteCode(event.target.value);
            setError("");
          }}
          autoFocus
          autoComplete="off"
          placeholder="ABC123"
          className="mt-3 w-full rounded-lg border border-line bg-panel px-4 py-4 text-2xl font-black uppercase tracking-[0.18em] text-white outline-none focus:border-neon"
        />
      </label>
      {error ? <p className="text-base font-bold text-shock sm:text-sm">{error}</p> : null}
      <Button type="submit" className="w-full text-lg sm:text-base">Join Match</Button>
    </form>
  );
}
