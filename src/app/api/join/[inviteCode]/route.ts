import { NextRequest, NextResponse } from "next/server";
import { joinMatch } from "@/lib/matchService";

export async function POST(request: NextRequest, { params }: { params: Promise<{ inviteCode: string }> }) {
  try {
    const { inviteCode } = await params;
    const body = await request.json();
    const match = await joinMatch({
      inviteCode: inviteCode.toUpperCase(),
      userId: body.userId,
      controlType: body.controlType,
      aiStrategy: body.aiStrategy
    });
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
