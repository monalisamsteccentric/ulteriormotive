import { VoteChoice, VoteStats } from "@/types/database";
import { supabaseAdmin, supabaseServer } from "./supabaseServer";

export async function vote(input: { matchId: string; voterUserId: string; vote: VoteChoice }) {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("votes").upsert(
    {
      match_id: input.matchId,
      voter_user_id: input.voterUserId,
      vote: input.vote
    },
    { onConflict: "match_id,voter_user_id" }
  );
  if (error) throw error;
}

export async function voteStats(matchId: string): Promise<VoteStats> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("get_vote_stats", { p_match_id: matchId });
  if (error) throw error;
  return normalizeVoteStats(data);
}

export async function getUserVote(input: { matchId: string; voterUserId: string }) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("votes")
    .select("vote")
    .eq("match_id", input.matchId)
    .eq("voter_user_id", input.voterUserId)
    .maybeSingle();
  if (error) throw error;
  return (data?.vote ?? null) as VoteChoice | null;
}

export async function broadcastVoteStats(matchId: string, stats: VoteStats) {
  const supabase = supabaseAdmin();
  const channel = supabase.channel(`votes:${matchId}`);
  await channel.subscribe();
  await channel.send({ type: "broadcast", event: "stats", payload: stats });
  await supabase.removeChannel(channel);
}

function normalizeVoteStats(data: unknown): VoteStats {
  const stats = (data ?? {}) as Partial<Record<keyof VoteStats, unknown>>;
  return {
    playerAIsAiPercent: toNumber(stats.playerAIsAiPercent),
    playerBIsAiPercent: toNumber(stats.playerBIsAiPercent),
    totalVotes: toNumber(stats.totalVotes)
  };
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}
