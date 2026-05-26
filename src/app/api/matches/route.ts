import { NextRequest, NextResponse } from "next/server";
import { createMatch } from "@/lib/matchService";
import { getSupabaseServerConfig } from "@/lib/serverConfig";

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
    const { missing } = getSupabaseServerConfig();
    if (missing.length > 0) {
      return Response.json(
        {
          error: "Supabase env missing",
          message: "SUPABASE_SERVICE_ROLE_KEY must be available to create matches on the server.",
          missing
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const match = await createMatch(body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
