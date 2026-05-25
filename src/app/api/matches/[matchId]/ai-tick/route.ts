import { NextResponse } from "next/server";
import { sendNextAiMessage } from "@/lib/matchService";

export async function POST(_: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const message = await sendNextAiMessage(matchId);
    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
