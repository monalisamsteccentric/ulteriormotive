import { NextRequest, NextResponse } from "next/server";
import { createMatch } from "@/lib/matchService";
import { getMissingSupabaseServiceEnvNames, getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabaseServer";

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
    const supabaseUrl = getSupabaseUrl();
    const supabaseServiceKey = getSupabaseServiceRoleKey();
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json(
        {
          error: "Supabase env missing",
          missing: getMissingSupabaseServiceEnvNames()
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
