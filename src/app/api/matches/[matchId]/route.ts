import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Failed";
}

export async function GET(_request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const supabase = await supabaseServer();
    const { data, error } = await supabase.from("public_matches").select("*").eq("id", matchId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Match not found." }, { status: 404 });

    return NextResponse.json(data, {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
