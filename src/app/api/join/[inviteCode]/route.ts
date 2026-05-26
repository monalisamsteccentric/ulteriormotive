import { NextRequest, NextResponse } from "next/server";
import { callMatchEdgeFunction } from "@/lib/edgeProxy";

export async function POST(request: NextRequest, { params }: { params: Promise<{ inviteCode: string }> }) {
  try {
    const { inviteCode } = await params;
    const body = await request.json();
    return callMatchEdgeFunction("join-match", {
      inviteCode: inviteCode.toUpperCase(),
      userId: body.userId,
      controlType: body.controlType,
      aiStrategy: body.aiStrategy
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
