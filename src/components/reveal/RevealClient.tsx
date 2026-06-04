"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { RevealStats } from "@/types/database";

export function RevealClient({ stats, replayHref }: { stats: RevealStats; replayHref: string }) {
  const [count, setCount] = useState(3);
  const winnerLabel =
    stats.scoreWinner === "player_a"
      ? "Player A won"
      : stats.scoreWinner === "player_b"
        ? "Player B won"
        : "It is a tie";
  const scoreReason =
    stats.scoreWinner === "tie"
      ? `Both players finished on ${stats.playerAScore.finalScore} points.`
      : `${stats.scoreWinner === "player_a" ? "Player A" : "Player B"} finished higher: Player A ${stats.playerAScore.finalScore}, Player B ${stats.playerBScore.finalScore}.`;

  useEffect(() => {
    if (count === 0) return;
    const id = window.setTimeout(() => setCount((value) => value - 1), 850);
    return () => window.clearTimeout(id);
  }, [count]);

  async function share() {
    const text = `Ulterior Motive reveal: ${winnerLabel}. Audience accuracy ${stats.audienceAccuracyPercent}%.`;
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
        <p className="text-sm font-black uppercase text-mist">Score winner</p>
        <p className="text-4xl font-black text-shock">{winnerLabel}</p>
        <p className="mt-2 text-sm font-bold leading-6 text-mist">
          Each player starts at 0. The player who revealed gains 30 for a correct guess; a wrong reveal gives them -30 and the other player +30.
        </p>
        <p className="mt-2 text-sm font-bold leading-6 text-white">{scoreReason}</p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard label="Player A" score={stats.playerAScore} />
        <ScoreCard label="Player B" score={stats.playerBScore} />
      </div>
      <section className="rounded-lg border border-line bg-ink p-5">
        <p className="text-sm font-black uppercase text-mist">Audience accuracy</p>
        <p className="text-4xl font-black text-neon">{stats.audienceAccuracyPercent}%</p>
        <p className="text-sm font-bold text-mist">{stats.correctVotes} correct out of {stats.totalVotes} votes</p>
      </section>
      <section className="rounded-lg border border-line bg-ink p-5">
        <p className="text-sm font-black uppercase text-mist">Deception result</p>
        <p className="mt-2 text-sm font-bold leading-6 text-mist">
          Player A fooled {stats.playerAWrongGuesses} voters. Player B fooled {stats.playerBWrongGuesses} voters.
        </p>
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

function ScoreCard({ label, score }: { label: string; score: RevealStats["playerAScore"] }) {
  const targetLabel = score.targetRole === "player_a" ? "Player A" : "Player B";
  const guessed = score.guessedType ? score.guessedType.toUpperCase() : "NO GUESS";
  const actual = score.targetActualType.toUpperCase();
  const result =
    score.correct === null
      ? "No score change"
      : score.correct
        ? "+30 for a correct reveal guess"
        : "-30 for a wrong reveal guess";

  return (
    <section className="rounded-lg border border-line bg-ink p-5">
      <p className="text-sm font-black uppercase text-mist">{label} score</p>
      <p className="mt-1 text-4xl font-black text-neon">{score.finalScore}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-mist">
        Guessed {targetLabel} was {guessed}. Actual: {actual}. {result}.
      </p>
    </section>
  );
}
