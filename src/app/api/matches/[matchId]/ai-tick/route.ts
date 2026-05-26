import { NextResponse } from "next/server";
import { callMatchEdgeFunction } from "@/lib/edgeProxy";

export async function POST(_: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    return callMatchEdgeFunction("ai-tick", { matchId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
