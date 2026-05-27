import { redirect } from "next/navigation";
import { RealtimeChat } from "@/components/chat/RealtimeChat";
import { AppShell } from "@/components/layout/AppShell";
import { AudienceStatsPanel } from "@/components/match/AudienceStatsPanel";
import { MatchSharePanel } from "@/components/match/MatchSharePanel";
import { RevealRequestPanel } from "@/components/match/RevealRequestPanel";
import { VotePanel } from "@/components/voting/VotePanel";
import { supabaseServer } from "@/lib/supabaseServer";
import { voteStats } from "@/lib/voteService";
import { Message, PublicMatch } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const supabase = await supabaseServer();
  const { data: match } = await supabase.from("public_matches").select("*").eq("id", matchId).maybeSingle();
  const { data: messages } = await supabase.from("public_messages").select("*").eq("match_id", matchId).order("created_at");

  if (!match && matchId !== "demo") redirect("/");

  const safeMatch = (match ?? {
    id: "demo",
    status: "live",
    invite_code: "DEMO42",
    created_at: new Date().toISOString(),
    wait_until: null,
    revealed_at: null,
    started_at: new Date().toISOString(),
    reveal_requested_by_user_id: null,
    reveal_requested_at: null,
    player_a_user_id: null,
    player_b_user_id: null,
    player_a_entered_at: null,
    player_b_entered_at: null
  }) as PublicMatch;

  if ((safeMatch.status === "revealed" || safeMatch.status === "completed") && safeMatch.id !== "demo") {
    redirect(`/match/${safeMatch.id}/reveal`);
  }

  const hasPlayerMessages = Boolean(messages?.some((message) => message.sender_role === "player_a" || message.sender_role === "player_b"));
  const effectiveStatus = safeMatch.status === "waiting" && hasPlayerMessages ? "live" : safeMatch.status;
  const stats = safeMatch.id === "demo" ? { playerAIsAiPercent: 51, playerBIsAiPercent: 37, totalVotes: 94 } : await voteStats(matchId);
  const isWaiting = effectiveStatus === "waiting";
  const bothSeatsFilled = Boolean(safeMatch.player_a_user_id && safeMatch.player_b_user_id);
  const statusLabel = isWaiting && bothSeatsFilled ? "Waiting for both players to enter" : isWaiting ? "Waiting for second player" : effectiveStatus.toUpperCase();
  const realMessages = messages?.filter((message) => !(hasPlayerMessages && message.sender_role === "system" && message.message.toLowerCase().includes("waiting for both players"))) ?? [];
  const safeMessages = ((realMessages.length ? realMessages : [
    {
      id: "1",
      match_id: safeMatch.id,
      sender_role: "system",
      sender_user_id: null,
      message: isWaiting ? statusLabel : "Match is live. Identities are hidden.",
      created_at: new Date().toISOString()
    }
  ]) ?? []) as Message[];
  const profileIds = [safeMatch.player_a_user_id, safeMatch.player_b_user_id].filter(isUuid) as string[];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, username").in("id", profileIds)
    : { data: [] };
  const profileNameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  const playerAName = safeMatch.player_a_user_id ? profileNameById.get(safeMatch.player_a_user_id) ?? "Player A" : "Player A";
  const playerBName = safeMatch.player_b_user_id ? profileNameById.get(safeMatch.player_b_user_id) ?? "Player B" : "Player B";

  return (
    <AppShell>
      <section className="mb-3 rounded-lg border border-line bg-ink p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-mist sm:text-xs">Match status</p>
            <p className={`mt-1 text-2xl font-black ${isWaiting ? "text-neon" : "text-shock"}`}>
              {statusLabel}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-black uppercase text-mist sm:text-xs">Invite code</p>
            <p className="mt-1 text-xl font-black text-white">{safeMatch.invite_code}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MatchSeat label="Player A" filled={Boolean(safeMatch.player_a_user_id)} entered={Boolean(safeMatch.player_a_entered_at)} />
          <MatchSeat label="Player B" filled={Boolean(safeMatch.player_b_user_id)} entered={Boolean(safeMatch.player_b_entered_at)} />
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <RealtimeChat
          matchId={safeMatch.id}
          initialMessages={safeMessages}
          userId={null}
          playerAUserId={safeMatch.player_a_user_id}
          playerBUserId={safeMatch.player_b_user_id}
          status={effectiveStatus}
          playerAIsAi={safeMatch.player_a_revealed_type === "ai"}
          playerBIsAi={safeMatch.player_b_revealed_type === "ai"}
        />
        <div className="space-y-3">
          <VotePanel
            matchId={safeMatch.id}
            userId={null}
            playerAUserId={safeMatch.player_a_user_id}
            playerBUserId={safeMatch.player_b_user_id}
            initialStats={stats}
          />
          <AudienceStatsPanel matchId={safeMatch.id} />
          <MatchSharePanel
            matchId={safeMatch.id}
            playerAUserId={safeMatch.player_a_user_id}
            playerBUserId={safeMatch.player_b_user_id}
            playerAName={playerAName}
            playerBName={playerBName}
          />
          <RevealRequestPanel
            matchId={safeMatch.id}
            status={effectiveStatus}
            startedAt={safeMatch.started_at}
            playerAUserId={safeMatch.player_a_user_id}
            playerBUserId={safeMatch.player_b_user_id}
            revealRequestedByUserId={safeMatch.reveal_requested_by_user_id}
            revealRequestedAt={safeMatch.reveal_requested_at}
            initialNow={Date.now()}
          />
        </div>
      </div>
    </AppShell>
  );
}

function isUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function MatchSeat({ label, filled, entered }: { label: string; filled: boolean; entered: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${entered ? "border-neon bg-neon/10" : filled ? "border-line bg-panel" : "border-line bg-panel/70"}`}>
      <p className="text-sm font-black uppercase text-mist sm:text-xs">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{entered ? "In chatroom" : filled ? "Seat filled" : "Waiting"}</p>
    </div>
  );
}
