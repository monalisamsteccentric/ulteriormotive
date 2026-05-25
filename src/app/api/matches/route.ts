import { NextRequest, NextResponse } from "next/server";
import { createMatch } from "@/lib/matchService";

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
    const match = await createMatch(body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
