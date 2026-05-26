import { NextRequest, NextResponse } from "next/server";
import { createMatch } from "@/lib/matchService";
import { getMissingSupabaseEnvNames, MissingSupabaseEnvError } from "@/lib/supabaseServer";

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
    const missing = getMissingSupabaseEnvNames(process.env);
    if (missing.length > 0) {
      console.error("Missing Supabase environment variables:", missing);
      return NextResponse.json(
        {
          error: "Missing Supabase server environment variables.",
          missing
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const match = await createMatch(body);
    return NextResponse.json(match);
  } catch (error) {
    if (error instanceof MissingSupabaseEnvError) {
      return NextResponse.json(
        {
          error: error.message,
          missing: error.missing
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
