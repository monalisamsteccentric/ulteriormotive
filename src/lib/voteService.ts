import { VoteChoice, VoteStats } from "@/types/database";
import { callMatchEdgeFunctionJson } from "./edgeProxy";

export async function vote(input: { matchId: string; voterUserId: string; vote: VoteChoice }) {
  await callMatchEdgeFunctionJson("vote", input);
}

export async function voteStats(matchId: string): Promise<VoteStats> {
  return callMatchEdgeFunctionJson<VoteStats>("vote-stats", { matchId });
}

export async function getUserVote(input: { matchId: string; voterUserId: string }) {
  const data = await callMatchEdgeFunctionJson<VoteStats & { selectedVote?: VoteChoice | null }>("vote-stats", input);
  return data.selectedVote ?? null;
}

export async function broadcastVoteStats(matchId: string, stats: VoteStats) {
  return { matchId, stats };
}
