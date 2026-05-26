import { NextRequest, NextResponse } from "next/server";
import { broadcastVoteStats, getUserVote, vote, voteStats } from "@/lib/voteService";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Failed";
}

export async function GET(request: NextRequest) {
  try {
    const matchId = request.nextUrl.searchParams.get("matchId");
    const voterUserId = request.nextUrl.searchParams.get("voterUserId");
    if (!matchId) throw new Error("Missing matchId.");
    const stats = await voteStats(matchId);
    if (voterUserId) {
      const selectedVote = await getUserVote({ matchId, voterUserId });
      return NextResponse.json({ ...stats, selectedVote }, {
        headers: { "cache-control": "no-store" }
      });
    }
    return NextResponse.json(stats, {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await vote(body);
    const stats = await voteStats(body.matchId);
    await broadcastVoteStats(body.matchId, stats);
    return NextResponse.json(stats, {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
