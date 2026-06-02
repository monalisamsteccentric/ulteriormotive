"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function WaitingTimer({
  matchId,
  waitUntil,
  isWaitingForSeat,
  initialNow
}: {
  matchId: string;
  waitUntil: string | null;
  isWaitingForSeat: boolean;
  initialNow: number;
}) {
  const router = useRouter();
  const endMs = useMemo(() => (waitUntil ? new Date(waitUntil).getTime() : null), [waitUntil]);
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const secondsLeft = endMs ? Math.max(0, Math.ceil((endMs - now) / 1000)) : null;
  const expired = isWaitingForSeat && secondsLeft === 0;

  useEffect(() => {
    if (!expired) return;
    const id = window.setTimeout(() => router.push(`/match/${matchId}/expired`), 700);
    return () => window.clearTimeout(id);
  }, [expired, matchId, router]);

  if (!isWaitingForSeat || secondsLeft === null) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <section className="mb-5 rounded-lg border border-neon bg-ink p-4 shadow-glow">
      <p className="text-sm font-black uppercase text-neon sm:text-xs">Waiting for challenger...</p>
      <p className="mt-1 text-3xl font-black text-neon">
        {minutes}:{String(seconds).padStart(2, "0")}
      </p>
      <p className="mt-2 text-sm font-bold text-mist">
        One seat remains. The match begins when both players arrive.
      </p>
    </section>
  );
}
