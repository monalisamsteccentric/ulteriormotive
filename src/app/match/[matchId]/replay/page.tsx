import { ChatBubble } from "@/components/chat/ChatBubble";
import { AppShell } from "@/components/layout/AppShell";
import { getRevealStats } from "@/lib/matchService";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { Message } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ReplayPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("public_messages").select("*").eq("match_id", matchId).order("created_at");
  const stats =
    matchId === "demo"
      ? { playerAType: "human" as const, playerBType: "ai" as const, audienceAccuracyPercent: 64, correctVotes: 60, playerAIsAiPercent: 36, playerBIsAiPercent: 64, totalVotes: 94 }
      : await getRevealStats(matchId);

  const messages = (data ?? []) as Message[];

  return (
    <AppShell>
      <section className="mb-4 rounded-lg border border-line bg-ink p-4">
        <h1 className="text-2xl font-black">Replay</h1>
        <p className="mt-2 text-sm font-bold text-mist">Player A: {stats.playerAType} | Player B: {stats.playerBType} | Accuracy: {stats.audienceAccuracyPercent}%</p>
      </section>
      <div className="space-y-3 rounded-lg border border-line bg-ink p-3">
        {messages.length ? messages.map((message) => <ChatBubble key={message.id} message={message} />) : <p className="text-sm font-bold text-mist">No messages yet.</p>}
      </div>
    </AppShell>
  );
}
