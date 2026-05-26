import { NextRequest, NextResponse } from "next/server";
import { callMatchEdgeFunction } from "@/lib/edgeProxy";

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
    return callMatchEdgeFunction("vote-stats", { matchId, voterUserId });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return callMatchEdgeFunction("vote", body);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
