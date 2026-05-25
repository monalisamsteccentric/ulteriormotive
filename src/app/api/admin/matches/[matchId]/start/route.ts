import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(_: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  await requireAdmin();
  await supabaseAdmin().from("matches").update({ status: "live", started_at: new Date().toISOString() }).eq("id", matchId);
  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}
