import { NextRequest, NextResponse } from "next/server";
import { callEdgeFunction } from "@/lib/edgeProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    return callEdgeFunction("create-match", body);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
