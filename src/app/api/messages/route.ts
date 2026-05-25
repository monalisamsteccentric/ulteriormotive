import { NextRequest, NextResponse } from "next/server";
import { sendAiReplyIfNeeded, sendMessage } from "@/lib/matchService";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Failed";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = await sendMessage(body);
    try {
      await sendAiReplyIfNeeded(body.matchId, message);
    } catch (aiError) {
      console.error("AI reply failed", aiError);
    }
    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
