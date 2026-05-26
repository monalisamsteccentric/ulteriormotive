import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Failed";
}

export async function GET(_: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("public_messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
