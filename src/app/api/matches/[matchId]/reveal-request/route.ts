import { NextRequest, NextResponse } from "next/server";
import { callMatchEdgeFunction } from "@/lib/edgeProxy";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Failed";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const body = await request.json();
    return callMatchEdgeFunction("reveal-request", { matchId, userId: body.userId });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
