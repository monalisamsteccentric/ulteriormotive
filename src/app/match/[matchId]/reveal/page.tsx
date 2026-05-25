import Link from "next/link";
import { redirect } from "next/navigation";
import { RevealClient } from "@/components/reveal/RevealClient";
import { AppShell } from "@/components/layout/AppShell";
import { getRevealStats } from "@/lib/matchService";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { PrivateMatch } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function RevealPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  if (matchId === "demo") {
    const stats = { playerAType: "human" as const, playerBType: "ai" as const, audienceAccuracyPercent: 64, correctVotes: 60, playerAIsAiPercent: 36, playerBIsAiPercent: 64, totalVotes: 94 };

    return (
      <AppShell>
        <RevealClient stats={stats} replayHref={`/match/${matchId}/replay`} />
      </AppShell>
    );
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (error) throw error;
  if (!data) redirect("/");

  const match = data as PrivateMatch;

  if (match.status !== "revealed" && match.status !== "completed") {
    return (
      <AppShell>
        <section className="rounded-lg border border-line bg-ink p-5">
          <p className="text-sm font-black uppercase text-mist">Reveal not ready</p>
          <h1 className="mt-2 text-3xl font-black text-white">Both players must agree before reveal.</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-mist">
            Return to the match room and use the reveal request panel. Reveal is blocked until at least two minutes have passed.
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
