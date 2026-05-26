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
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-ink p-4">
      <label className="block">
        <span className="text-sm font-black uppercase text-mist sm:text-xs">Match ID</span>
        <input
          value={inviteCode}
          onChange={(event) => {
            setInviteCode(event.target.value);
            setError("");
          }}
          autoFocus
          autoComplete="off"
          placeholder="ABC123"
          className="mt-2 w-full rounded-lg border border-line bg-panel px-4 py-3 text-lg font-black uppercase tracking-[0.18em] text-white outline-none focus:border-neon"
        />
      </label>
      {error ? <p className="text-base font-bold text-shock sm:text-sm">{error}</p> : null}
      <Button type="submit" className="w-full">Join match</Button>
    </form>
  );
}
