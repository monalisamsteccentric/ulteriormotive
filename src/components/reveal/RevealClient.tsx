"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { RevealStats } from "@/types/database";

export function RevealClient({ stats, replayHref }: { stats: RevealStats; replayHref: string }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) return;
    const id = window.setTimeout(() => setCount((value) => value - 1), 850);
    return () => window.clearTimeout(id);
  }, [count]);

  async function share() {
    const text = `Ulterior Motive reveal: audience accuracy ${stats.audienceAccuracyPercent}%.`;
    if (navigator.share) await navigator.share({ text, url: window.location.href });
    else await navigator.clipboard.writeText(`${text} ${window.location.href}`);
  }

  if (count > 0) {
    return <div className="grid min-h-[60dvh] place-items-center text-8xl font-black text-shock animate-glitch">{count}</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="animate-glitch text-center text-3xl font-black text-shock">IDENTITIES UNLOCKED</h1>
      <RevealCard label="Player A" value={stats.playerAType.toUpperCase()} />
      <RevealCard label="Player B" value={stats.playerBType.toUpperCase()} />
      <section className="rounded-lg border border-line bg-ink p-5">
        <p className="text-sm font-black uppercase text-mist">Audience accuracy</p>
        <p className="text-4xl font-black text-neon">{stats.audienceAccuracyPercent}%</p>
        <p className="text-sm font-bold text-mist">{stats.correctVotes} correct out of {stats.totalVotes} votes</p>
      </section>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={share}>
          <Share2 className="mr-2" size={18} /> Share result
        </Button>
        <a href={replayHref} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-black">
          Watch replay
        </a>
      </div>
    </div>
  );
}

function RevealCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-lg border border-line bg-ink p-5">
      <p className="text-sm font-black uppercase text-mist">{label} was</p>
      <p className="text-4xl font-black text-neon">{value}</p>
    </section>
  );
}
