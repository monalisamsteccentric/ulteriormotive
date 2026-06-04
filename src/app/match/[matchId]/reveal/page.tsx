import Link from "next/link";
import { redirect } from "next/navigation";
import { RevealClient } from "@/components/reveal/RevealClient";
import { AppShell } from "@/components/layout/AppShell";
import { getRevealStats } from "@/lib/revealStats";
import { supabaseServer } from "@/lib/supabaseServer";
import { PublicMatch } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function RevealPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  if (matchId === "demo") {
    const stats = {
      playerAType: "human" as const,
      playerBType: "ai" as const,
      audienceAccuracyPercent: 64,
      correctVotes: 60,
      playerAIsAiPercent: 36,
      playerBIsAiPercent: 64,
      totalVotes: 94,
      playerAWrongGuesses: 34,
      playerBWrongGuesses: 28,
      deceptionWinner: "player_a" as const,
      playerAScore: {
        role: "player_a" as const,
        targetRole: "player_b" as const,
        targetActualType: "ai" as const,
        guessedType: "ai" as const,
        correct: true,
        baseScore: 0,
        percentChange: 30,
        finalScore: 30
      },
      playerBScore: {
        role: "player_b" as const,
        targetRole: "player_a" as const,
        targetActualType: "human" as const,
        guessedType: "ai" as const,
        correct: false,
        baseScore: 0,
        percentChange: -30,
        finalScore: 0
      },
      scoreWinner: "player_a" as const
    };

    return (
      <AppShell>
        <RevealClient stats={stats} replayHref={`/match/${matchId}/replay`} />
      </AppShell>
    );
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("public_matches").select("*").eq("id", matchId).maybeSingle();
  if (error) throw error;
  if (!data) redirect("/");

  const match = data as PublicMatch;

  if (match.status !== "revealed" && match.status !== "completed") {
    return (
      <AppShell>
        <section className="rounded-lg border border-line bg-ink p-5">
          <p className="text-sm font-black uppercase text-mist">Reveal not ready</p>
          <h1 className="mt-2 text-3xl font-black text-white">Make your guess before reveal.</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-mist">
            Return to the match room, choose whether the other player is AI or human, then press Reveal Truth.
          </p>
          <Link href={`/match/${matchId}`} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-black">
            Back to match
          </Link>
        </section>
      </AppShell>
    );
  }

  const stats = await getRevealStats(matchId);

  return (
    <AppShell>
      <RevealClient stats={stats} replayHref={`/match/${matchId}/replay`} />
    </AppShell>
  );
}
