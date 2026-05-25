import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(_: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  await requireAdmin();
  const supabase = supabaseAdmin();
  const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single();
  if (match) {
    const update = !match.player_a_control_type
      ? { player_a_control_type: "ai", status: "live" }
      : { player_b_control_type: "ai", status: "live" };
    await supabase.from("matches").update(update).eq("id", matchId);
  }
  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}
