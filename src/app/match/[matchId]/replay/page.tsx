import { ChatBubble } from "@/components/chat/ChatBubble";
import { AppShell } from "@/components/layout/AppShell";
import { getRevealStats } from "@/lib/revealStats";
import { supabaseServer } from "@/lib/supabaseServer";
import { Message } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ReplayPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("public_messages").select("*").eq("match_id", matchId).order("created_at");
  const stats =
    matchId === "demo"
      ? {
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
        }
      : await getRevealStats(matchId);

  const messages = (data ?? []) as Message[];

  return (
    <AppShell>
      <section className="mb-4 rounded-lg border border-line bg-ink p-4">
        <h1 className="text-2xl font-black">Replay</h1>
        <p className="mt-2 text-sm font-bold text-mist">Player A: {stats.playerAType} | Player B: {stats.playerBType} | Accuracy: {stats.audienceAccuracyPercent}%</p>
        <p className="mt-1 text-sm font-bold text-mist">Score: Player A {stats.playerAScore.finalScore} | Player B {stats.playerBScore.finalScore}</p>
      </section>
      <div className="space-y-3 rounded-lg border border-line bg-ink p-3">
        {messages.length ? messages.map((message) => <ChatBubble key={message.id} message={message} />) : <p className="text-sm font-bold text-mist">No messages yet.</p>}
      </div>
    </AppShell>
  );
}
